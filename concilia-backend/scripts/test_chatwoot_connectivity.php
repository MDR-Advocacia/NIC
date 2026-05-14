#!/usr/bin/env php
<?php

$chatwootUrl = getenv('CHATWOOT_URL') ?: ($argv[1] ?? null);
$chatwootAccountId = getenv('CHATWOOT_ACCOUNT_ID') ?: ($argv[2] ?? null);
$platformToken = getenv('CHATWOOT_PLATFORM_API_TOKEN') ?: ($argv[3] ?? null);

if (!$chatwootUrl || !$chatwootAccountId || !$platformToken) {
    fwrite(STDERR, "Uso: php scripts/test_chatwoot_connectivity.php [CHATWOOT_URL] [CHATWOOT_ACCOUNT_ID] [CHATWOOT_PLATFORM_API_TOKEN]\n");
    fwrite(STDERR, "Ou exporte CHATWOOT_URL, CHATWOOT_ACCOUNT_ID e CHATWOOT_PLATFORM_API_TOKEN no ambiente do container.\n");
    exit(1);
}

$chatwootUrl = rtrim($chatwootUrl, '/');
$endpoint = "{$chatwootUrl}/platform/api/v1/accounts/{$chatwootAccountId}/account_users";

if (!function_exists('curl_version')) {
    fwrite(STDERR, "Erro: a extensao cURL do PHP nao esta disponivel.\n");
    exit(2);
}

$ch = curl_init($endpoint);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "api_access_token: {$platformToken}",
    'Accept: application/json',
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

$body = curl_exec($ch);
$error = curl_error($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Chatwoot URL: {$chatwootUrl}\n";
echo "Account ID: {$chatwootAccountId}\n";
echo "Endpoint: {$endpoint}\n";

echo "HTTP status: {$status}\n";

if ($error !== '') {
    echo "cURL error: {$error}\n";
    exit(3);
}

if ($body === false) {
    echo "Falha ao receber resposta do Chatwoot.\n";
    exit(4);
}

echo "Resposta: \n";
echo $body . "\n";

if ($status >= 200 && $status < 300) {
    echo "\nConectividade OK. O backend consegue falar com o Chatwoot.\n";
    exit(0);
}

exit(5);
