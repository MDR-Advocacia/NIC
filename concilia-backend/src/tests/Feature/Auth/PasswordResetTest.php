<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\PasswordResetLinkNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_password_link_can_be_requested(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->postJson('/api/forgot-password', ['email' => $user->email])
            ->assertOk()
            ->assertJson([
                'status' => 'Enviamos o link de redefinicao para o e-mail informado.',
            ]);

        Notification::assertSentTo($user, PasswordResetLinkNotification::class);
    }

    public function test_password_can_be_reset_with_valid_token(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'must_change_password' => true,
        ]);

        $this->postJson('/api/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, PasswordResetLinkNotification::class, function (object $notification) use ($user) {
            $response = $this->postJson('/api/reset-password', [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'NovaSenha.123',
                'password_confirmation' => 'NovaSenha.123',
            ]);

            $response
                ->assertOk()
                ->assertJson([
                    'status' => 'Senha redefinida com sucesso.',
                ]);

            $user->refresh();

            $this->assertTrue(Hash::check('NovaSenha.123', $user->password));
            $this->assertFalse($user->must_change_password);

            return true;
        });
    }
}
