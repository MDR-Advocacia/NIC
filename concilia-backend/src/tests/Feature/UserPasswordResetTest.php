<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrator_can_reset_another_user_password(): void
    {
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
                'message' => 'Senha resetada com sucesso. O usuário precisará alterar a senha no próximo login.',
            ]);

        $managedUser->refresh();

        $this->assertTrue(Hash::check('Mudar.123@', $managedUser->password));
        $this->assertTrue($managedUser->must_change_password);
        $this->assertSame(0, $managedUser->tokens()->count());
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
