<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // --- AQUI ESTÁ A SOLUÇÃO DO CORS ---
        // Adicionamos o middleware manual que força a aceitação do Frontend
        // Certifique-se de que o arquivo app/Http/Middleware/ForceCors.php existe!
        $middleware->append(\App\Http\Middleware\ForceCors::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();