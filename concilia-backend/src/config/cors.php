<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_filter(array_map(
        static fn ($origin) => trim($origin),
        explode(',', (string) env(
            'CORS_ALLOWED_ORIGINS',
            'https://lab-nic.mdradvocacia.com,https://nic.mdradvocacia.com,http://localhost:3000,http://localhost:5173'
        ))
    ))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => filter_var(env('SUPPORT_CREDENTIALS', true), FILTER_VALIDATE_BOOL),
];
