<?php

/**
 * Script para testar webhook do Chatwoot
 * Execute: php scripts/test_chatwoot_webhook.php
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Api\WebhookController;

// Simula um payload de webhook do Chatwoot
$testPayloads = [
    'message_created' => [
        'event' => 'message_created',
        'id' => 12345,
        'content' => 'Olá, preciso de ajuda com meu processo!',
        'message_type' => 'incoming',
        'conversation' => [
            'id' => 67890,
            'status' => 'open'
        ],
        'sender' => [
            'id' => 111,
            'name' => 'João Cliente',
            'phone_number' => '+5511999999999'
        ],
        'account' => [
            'id' => 1
        ],
        'inbox' => [
            'id' => 2,
            'name' => 'WhatsApp Principal'
        ]
    ],

    'conversation_status_changed' => [
        'event' => 'conversation_status_changed',
        'conversation' => [
            'id' => 67890,
            'status' => 'resolved'
        ],
        'account' => [
            'id' => 1
        ]
    ]
];

echo "=== Teste de Webhook Chatwoot ===\n\n";

// Testa cada tipo de evento
foreach ($testPayloads as $eventType => $payload) {
    echo "Testando evento: {$eventType}\n";

    // Simula uma requisição HTTP
    $jsonPayload = json_encode($payload);

    // Calcula assinatura HMAC se houver secret configurada
    $secret = getenv('CHATWOOT_WEBHOOK_SECRET') ?: null;
    $signature = null;

    if ($secret) {
        $signature = 'sha256=' . hash_hmac('sha256', $jsonPayload, $secret);
        echo "  Assinatura calculada: {$signature}\n";
    }

    // Simula headers
    $headers = [
        'Content-Type' => 'application/json',
        'User-Agent' => 'Chatwoot-Webhook/1.0'
    ];

    if ($signature) {
        $headers['X-Chatwoot-Signature'] = $signature;
    }

    echo "  Payload: " . substr($jsonPayload, 0, 100) . "...\n";
    echo "  Status: Simulado com sucesso\n\n";
}

echo "=== Configuração do Webhook ===\n";
echo "1. URL do webhook: POST /api/webhooks/chatwoot\n";
echo "2. Eventos suportados: message_created, message_updated, conversation_created, conversation_updated, conversation_status_changed\n";
echo "3. Validação: HMAC-SHA256 (opcional via CHATWOOT_WEBHOOK_SECRET)\n";
echo "4. Resposta: HTTP 200 OK para sucesso\n\n";

echo "Para testar com curl:\n";
echo "curl -X POST http://localhost:8000/api/webhooks/chatwoot \\\n";
echo "  -H 'Content-Type: application/json' \\\n";
echo "  -d '" . json_encode($testPayloads['message_created']) . "'\n\n";