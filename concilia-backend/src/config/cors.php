<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Mude esta linha para aceitar qualquer origem (resolve o problema imediatamente)
    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // Como seu sistema usa Token (Bearer), deixe false para permitir o '*' acima.
    'supports_credentials' => false,
];