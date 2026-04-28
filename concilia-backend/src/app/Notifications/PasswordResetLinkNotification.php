<?php

namespace App\Notifications;

use App\Support\FrontendUrlResolver;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PasswordResetLinkNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly string $token)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $frontendUrl = FrontendUrlResolver::resolve(
            config('app.frontend_url'),
            config('app.url'),
            request()?->getSchemeAndHttpHost()
        );

        $email = rawurlencode($notifiable->getEmailForPasswordReset());
        $resetUrl = "{$frontendUrl}/password-reset/{$this->token}?email={$email}";
        $broker = config('auth.defaults.passwords', 'users');
        $expiresIn = (int) config("auth.passwords.{$broker}.expire", 60);

        return (new MailMessage)
            ->subject('Redefinicao de senha - NIC')
            ->view('emails.password-reset', [
                'appName' => config('app.name', 'NIC'),
                'expiresIn' => $expiresIn,
                'resetUrl' => $resetUrl,
                'userName' => $notifiable->name ?: 'usuario',
            ]);
    }

    public function toArray(object $notifiable): array
    {
        return [];
    }
}
