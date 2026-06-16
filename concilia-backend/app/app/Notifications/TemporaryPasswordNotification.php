<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TemporaryPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly string $temporaryPassword)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Senha temporaria de acesso - NIC')
            ->view('emails.temporary-password', [
                'appName' => config('app.name', 'NIC'),
                'temporaryPassword' => $this->temporaryPassword,
                'userName' => $notifiable->name ?: 'usuario',
            ]);
    }

    public function toArray(object $notifiable): array
    {
        return [];
    }
}
