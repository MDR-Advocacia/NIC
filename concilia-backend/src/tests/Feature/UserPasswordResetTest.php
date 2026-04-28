<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\User;
use App\Notifications\TemporaryPasswordNotification;
use App\Notifications\UserInvitationNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrator_can_create_user_without_password_and_send_invitation(): void
    {
        Notification::fake();

        $administrator = User::factory()->create([
            'role' => 'administrador',
            'status' => 'ativo',
        ]);

        $department = Department::create(['name' => 'Operacao']);

        Sanctum::actingAs($administrator);

        $this->postJson('/api/users', [
            'name' => 'Novo Usuario',
            'email' => 'novo.usuario@example.com',
            'role' => 'operador',
            'department_id' => $department->id,
            'status' => 'ativo',
            'area' => 'Atendente',
        ])
            ->assertCreated()
            ->assertJson([
                'message' => 'Usuario criado com sucesso. Enviamos um e-mail para confirmar o acesso e criar a senha.',
                'invitation_email_sent' => true,
            ]);

        $createdUser = User::where('email', 'novo.usuario@example.com')->firstOrFail();

        $this->assertFalse($createdUser->must_change_password);
        $this->assertNull($createdUser->email_verified_at);
        $this->assertFalse(Hash::check('123456', $createdUser->password));

        Notification::assertSentTo($createdUser, UserInvitationNotification::class);
    }

    public function test_administrator_can_reset_another_user_password(): void
    {
        Notification::fake();

        $administrator = User::factory()->create([
            'role' => 'administrador',
            'status' => 'ativo',
        ]);

        $managedUser = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
            'password' => Hash::make('Anterior.123@'),
            'must_change_password' => false,
        ]);

        $managedUser->createToken('sessao-antiga');

        Sanctum::actingAs($administrator);

        $this->postJson("/api/users/{$managedUser->id}/reset-password")
            ->assertOk()
            ->assertJson([
                'message' => 'Senha temporaria gerada e enviada para o e-mail do usuario. Ele precisara altera-la no proximo login.',
                'temporary_password_email_sent' => true,
            ]);

        $managedUser->refresh();

        $this->assertTrue($managedUser->must_change_password);
        $this->assertSame(0, $managedUser->tokens()->count());

        Notification::assertSentTo(
            $managedUser,
            TemporaryPasswordNotification::class,
            fn (TemporaryPasswordNotification $notification) => Hash::check($notification->temporaryPassword, $managedUser->password)
        );
    }

    public function test_supervisor_cannot_reset_user_password(): void
    {
        $supervisor = User::factory()->create([
            'role' => 'supervisor',
            'status' => 'ativo',
        ]);

        $managedUser = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
            'password' => Hash::make('Anterior.123@'),
            'must_change_password' => false,
        ]);

        Sanctum::actingAs($supervisor);

        $this->postJson("/api/users/{$managedUser->id}/reset-password")
            ->assertForbidden();

        $managedUser->refresh();

        $this->assertTrue(Hash::check('Anterior.123@', $managedUser->password));
        $this->assertFalse($managedUser->must_change_password);
    }
}
