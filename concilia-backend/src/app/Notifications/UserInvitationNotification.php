<?php

namespace App\Notifications;

use App\Support\FrontendUrlResolver;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UserInvitationNotification extends Notification
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
        $setupUrl = "{$frontendUrl}/password-reset/{$this->token}?email={$email}&first_access=1";
        $broker = config('auth.defaults.passwords', 'users');
        $expiresIn = (int) config("auth.passwords.{$broker}.expire", 60);

        return (new MailMessage)
            ->subject('Confirme seu e-mail e crie sua senha - NIC')
            ->view('emails.user-invitation', [
                'appName' => config('app.name', 'NIC'),
                'expiresIn' => $expiresIn,
                'setupUrl' => $setupUrl,
                'userName' => $notifiable->name ?: 'usuario',
            ]);
    }

    public function toArray(object $notifiable): array
    {
        return [];
    }
}
