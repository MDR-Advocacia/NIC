<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout'],
    'allowed_methods' => ['*'],
    // 'allowed_origins' => [env('CORS_ALLOWED_ORIGINS', 'https://lab-nic.mdradvocacia.com')],
    'allowed_origins' => [
        'https://lab-nic.mdradvocacia.com',
        'http://localhost:3000'
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];

