<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Conversation;
use App\Models\ChatMessage;
use Illuminate\Support\Facades\Log;

class ChatwootWebhookController extends Controller
{
    public function receive(Request $request)
    {
        $data = $request->all();
        
        // Log para você conferir no terminal do Coolify se os dados estão chegando
        Log::info('Dados do Chatwoot:', $data);

        $event = $data['event'] ?? '';

        if ($event === 'message_created') {
            $chatwootId = $data['conversation']['id'];
            
            // 1. Encontra ou cria a conversa no seu banco
            $conversation = Conversation::firstOrCreate(
                ['chatwoot_id' => $chatwootId],
                [
                    'contact_name' => $data['sender']['name'] ?? 'Cliente WhatsApp',
                    'status' => 'open'
                ]
            );

            // 2. Salva a mensagem na sua tabela de mensagens
            // Ajuste os nomes das colunas conforme sua migration
            $conversation->chatMessages()->create([
                'content' => $data['content'],
                'sender_type' => $data['message_type'], // 'incoming' ou 'outgoing'
                'timestamp' => now(),
            ]);
        }

        return response()->json(['status' => 'success']);
    }
}