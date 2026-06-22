<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function receive(Request $request)
    {
        // Validação de assinatura HMAC-SHA256 (se configurada)
        if (!$this->validateSignature($request)) {
            Log::warning('Webhook Chatwoot: Assinatura inválida', [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'headers' => $request->headers->all(),
            ]);
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $payload = $request->all();
        $event = $payload['event'] ?? 'unknown';

        // Log básico do evento
        Log::info('Webhook Chatwoot recebido', [
            'event' => $event,
            'conversation_id' => data_get($payload, 'conversation.id'),
            'message_id' => data_get($payload, 'id') ?? data_get($payload, 'message.id'),
            'account_id' => data_get($payload, 'account.id'),
            'inbox_id' => data_get($payload, 'inbox.id'),
        ]);

        // Cache do último evento para debug
        Cache::put('chatwoot:webhook:last_event', [
            'event' => $event,
            'conversation_id' => data_get($payload, 'conversation.id'),
            'message_id' => data_get($payload, 'id') ?? data_get($payload, 'message.id'),
            'received_at' => now()->toIso8601String(),
            'payload_size' => strlen(json_encode($payload)),
        ], now()->addDay());

        // Processamento específico por tipo de evento
        try {
            switch ($event) {
                case 'message_created':
                    $this->handleMessageCreated($payload);
                    break;

                case 'message_updated':
                    $this->handleMessageUpdated($payload);
                    break;

                case 'conversation_created':
                    $this->handleConversationCreated($payload);
                    break;

                case 'conversation_updated':
                    $this->handleConversationUpdated($payload);
                    break;

                case 'conversation_status_changed':
                    $this->handleConversationStatusChanged($payload);
                    break;

                default:
                    Log::debug('Evento Chatwoot não processado', ['event' => $event]);
                    break;
            }
        } catch (\Exception $e) {
            Log::error('Erro ao processar webhook Chatwoot', [
                'event' => $event,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Processing failed'], 500);
        }

        return response()->json(['status' => 'ok'], 200);
    }

    /**
     * Valida a assinatura HMAC-SHA256 do webhook
     */
    private function validateSignature(Request $request): bool
    {
        $secret = config('app.chatwoot_webhook_secret');

        // Se não há secret configurada, permite sem validação
        if (empty($secret)) {
            return true;
        }

        $signature = $request->header('X-Chatwoot-Signature');

        if (empty($signature)) {
            return false;
        }

        // Chatwoot usa HMAC-SHA256
        $expectedSignature = 'sha256=' . hash_hmac('sha256', $request->getContent(), $secret);

        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Processa evento de mensagem criada
     */
    private function handleMessageCreated(array $payload): void
    {
        $conversationId = data_get($payload, 'conversation.id');
        $messageId = data_get($payload, 'id');
        $content = data_get($payload, 'content');
        $messageType = data_get($payload, 'message_type'); // 'incoming' ou 'outgoing'
        $sender = data_get($payload, 'sender');

        Log::info('Nova mensagem Chatwoot', [
            'conversation_id' => $conversationId,
            'message_id' => $messageId,
            'message_type' => $messageType,
            'sender_name' => data_get($sender, 'name'),
            'content_length' => strlen($content ?? ''),
        ]);

        // TODO: Implementar lógica de negócio aqui
        // Ex: salvar mensagem no banco, notificar usuário, etc.
    }

    /**
     * Processa evento de mensagem atualizada
     */
    private function handleMessageUpdated(array $payload): void
    {
        $messageId = data_get($payload, 'id');
        $conversationId = data_get($payload, 'conversation.id');

        Log::info('Mensagem Chatwoot atualizada', [
            'message_id' => $messageId,
            'conversation_id' => $conversationId,
        ]);

        // TODO: Implementar lógica de atualização
    }

    /**
     * Processa evento de conversa criada
     */
    private function handleConversationCreated(array $payload): void
    {
        $conversationId = data_get($payload, 'conversation.id');
        $contact = data_get($payload, 'contact');
        $inbox = data_get($payload, 'inbox');

        Log::info('Nova conversa Chatwoot', [
            'conversation_id' => $conversationId,
            'contact_name' => data_get($contact, 'name'),
            'contact_phone' => data_get($contact, 'phone_number'),
            'inbox_name' => data_get($inbox, 'name'),
        ]);

        // TODO: Implementar criação de conversa no sistema
    }

    /**
     * Processa evento de conversa atualizada
     */
    private function handleConversationUpdated(array $payload): void
    {
        $conversationId = data_get($payload, 'conversation.id');
        $status = data_get($payload, 'status');

        Log::info('Conversa Chatwoot atualizada', [
            'conversation_id' => $conversationId,
            'status' => $status,
        ]);

        // TODO: Implementar atualização de conversa
    }

    /**
     * Processa evento de mudança de status da conversa
     */
    private function handleConversationStatusChanged(array $payload): void
    {
        $conversationId = data_get($payload, 'conversation.id');
        $status = data_get($payload, 'status'); // 'open', 'resolved', 'pending', etc.

        Log::info('Status da conversa Chatwoot alterado', [
            'conversation_id' => $conversationId,
            'new_status' => $status,
        ]);

        // TODO: Implementar mudança de status no sistema
    }
}
