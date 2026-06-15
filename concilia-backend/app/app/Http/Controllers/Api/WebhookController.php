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
        $payload = $request->all();
        $event = $payload['event'] ?? 'unknown';
        $conversationId = data_get($payload, 'conversation.id');
        $messageId = data_get($payload, 'id') ?? data_get($payload, 'message.id');

        Cache::put('chatwoot:webhook:last_event', [
            'event' => $event,
            'conversation_id' => $conversationId,
            'message_id' => $messageId,
            'received_at' => now()->toIso8601String(),
        ], now()->addDay());

        Log::info('Webhook do Chatwoot recebido', [
            'event' => $event,
            'conversation_id' => $conversationId,
            'message_id' => $messageId,
        ]);

        if (in_array($event, ['message_created', 'message_updated', 'conversation_status_changed'], true)) {
            Log::debug('Payload completo do webhook do Chatwoot', $payload);
        }

        return response()->json(['status' => 'ok'], 200);
    }
}
