<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LegalCase; // Adicione no topo do arquivo
use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    private $chatwootUrl;
    private $apiToken;
    private $accountId;

    public function __construct()
    {
        // Pega as credenciais do .env
        $this->chatwootUrl = config('app.chatwoot_url');
        $this->apiToken = config('app.chatwoot_api_token');
        $this->accountId = config('app.chatwoot_account_id');
    }

    /**
     * Busca conversas no Chatwoot e filtra as que não estão vinculadas.
     */
   public function getUnassignedConversations()
    {
        // 1. Importa o modelo Conversation se ainda não foi importado no topo do arquivo.
        // use App\Models\Conversation;

        // 2. Busca no seu banco de dados todas as conversas onde 'legal_case_id' é nulo.
        $unassignedConversations = \App\Models\Conversation::whereNull('legal_case_id')
            ->orderBy('timestamp', 'desc') // Ordena pelas mais recentes
            ->get();

        // 3. Retorna os dados encontrados como resposta para o frontend.
        return response()->json($unassignedConversations);
    }

    /**
     * Vincula uma conversa do Chatwoot a um processo/pasta.
     */
    public function linkConversation(Request $request, $conversationId)
    {
        $validated = $request->validate([
            'legal_case_id' => 'required|integer|exists:legal_cases,id',
        ]);

        // --- INÍCIO DA LÓGICA LOCAL ADICIONADA ---
        // Vamos assumir que você tem um modelo Conversation que representa as conversas no seu banco de dados.
        // Se o nome do seu modelo for diferente, ajuste aqui.
        $conversation = \App\Models\Conversation::find($conversationId);

        if (!$conversation) {
            // Se a conversa não existir no seu banco de dados local (porque veio do mock do frontend),
            // você pode optar por criá-la aqui ou retornar um erro.
            // Por enquanto, vamos apenas retornar sucesso para o frontend funcionar.
            // O ideal no futuro seria que a lista de conversas viesse da sua API, não de mocks.
        } else {
            // Se a conversa foi encontrada, atualiza e salva o ID do caso.
            $conversation->legal_case_id = $validated['legal_case_id'];
            $conversation->save();
        }
        // --- FIM DA LÓGICA LOCAL ADICIONADA ---


        // --- INÍCIO DA PARTE A SER DESATIVADA ---
        /*
        // O código abaixo tenta se comunicar com o Chatwoot e está causando o erro.
        // Vamos comentá-lo para que seja ignorado.
        $payload = [
            'custom_attributes' => [
                'legal_case_id' => (string)$validated['legal_case_id'], // Chatwoot espera strings
                'link_do_caso' => url("/cases/{$validated['legal_case_id']}") // Link opcional
            ]
        ];

        $response = Http::withHeaders([
            'api_access_token' => $this->apiToken,
            'Content-Type' => 'application/json; charset=utf-8'
        ])->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}/custom_attributes", $payload);

        if ($response->failed()) {
            return response()->json(['message' => 'Falha ao vincular a conversa no Chatwoot', 'details' => $response->body()], 500);
        }

        return response()->json($response->json());
        */
        // --- FIM DA PARTE A SER DESATIVADA ---


        // ADICIONADO: Retorna uma resposta de sucesso simples para o frontend.
        return response()->json(['message' => 'Vinculação processada com sucesso.']);
    }

    /**
     * Busca todas as mensagens de uma conversa específica.
     */
    public function getConversationMessages($conversationId)
    {
        $conversation = Conversation::find($conversationId);

        if (!$conversation) {
            return response()->json([], 404); // Retorna 'Not Found' se a conversa não existir
        }

        // Busca as mensagens usando a relação que definimos no modelo Conversation
        $messages = $conversation->chatMessages()->orderBy('created_at', 'asc')->get();

        return response()->json($messages);
    }
    

    /**
     * Envia uma nova mensagem para uma conversa.
     */
    public function sendMessage(Request $request, $conversationId)
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $payload = [
            'content' => $validated['content'],
            'message_type' => 'outgoing', // Mensagem enviada pelo agente
        ];

        $response = Http::withHeaders([
            'api_access_token' => $this->apiToken,
            'Content-Type' => 'application/json; charset=utf-8'
        ])->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}/messages", $payload);

        if ($response->failed()) {
            return response()->json(['message' => 'Falha ao enviar mensagem', 'details' => $response->body()], 500);
        }

        return response()->json($response->json());
    }

    public function getConversationByCase(LegalCase $legal_case)
    {
        // Encontra a primeira conversa associada a este caso
        $conversation = Conversation::where('legal_case_id', $legal_case->id)->first();

        if (!$conversation) {
            return response()->json(['messages' => []]); // Retorna vazio se não houver conversa
        }

        $messages = $conversation->chatMessages()->orderBy('created_at', 'asc')->get();

        return response()->json([
            'conversation' => $conversation,
            'messages' => $messages,
        ]);
    }
}
