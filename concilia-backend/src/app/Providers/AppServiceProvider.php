<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate; // <--- Importante: Para registrar permissões
use App\Models\LegalCase;
use App\Models\User;           // <--- Importante: O Modelo
use App\Policies\LegalCasePolicy;
use App\Policies\UserPolicy;   // <--- Importante: As Regras

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // --- REGISTRO DA SEGURANÇA (ACL) ---
        // Ensina o Laravel que para mexer em 'User', deve obedecer 'UserPolicy'
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(LegalCase::class, LegalCasePolicy::class);
        // -----------------------------------

        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            $frontendUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/');
            $email = rawurlencode($notifiable->getEmailForPasswordReset());

            return "{$frontendUrl}/password-reset/{$token}?email={$email}";
        });
    }
}
