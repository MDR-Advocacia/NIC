<?php

namespace App\Providers;

use App\Models\LegalCase;
use App\Models\User;
use App\Policies\LegalCasePolicy;
use App\Policies\UserPolicy;
use App\Support\FrontendUrlResolver;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

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
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(LegalCase::class, LegalCasePolicy::class);

        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            $frontendUrl = FrontendUrlResolver::resolve(
                config('app.frontend_url'),
                config('app.url'),
                request()?->getSchemeAndHttpHost()
            );

            $email = rawurlencode($notifiable->getEmailForPasswordReset());

            return "{$frontendUrl}/password-reset/{$token}?email={$email}";
        });
    }
}
