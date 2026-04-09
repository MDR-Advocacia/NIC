<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\LegalCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CaseAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_batch_transfer_can_remove_the_responsible_user(): void
    {
        $manager = User::factory()->create([
            'role' => 'administrador',
            'status' => 'ativo',
        ]);

        $operator = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
        ]);

        Sanctum::actingAs($manager);

        $firstCase = $this->createLegalCase($operator, '08011957020268205004');
        $secondCase = $this->createLegalCase($operator, '06014605620248045300');

        $this->postJson('/api/cases/batch-update', [
            'case_ids' => [$firstCase->id, $secondCase->id],
            'action' => 'transfer_user',
            'value' => '__unassigned__',
        ])->assertOk();

        $this->assertNull($firstCase->fresh()->user_id);
        $this->assertNull($secondCase->fresh()->user_id);
    }

    public function test_batch_transfer_only_accepts_active_operator_users(): void
    {
        $manager = User::factory()->create([
            'role' => 'administrador',
            'status' => 'ativo',
        ]);

        $operator = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
        ]);

        $supervisor = User::factory()->create([
            'role' => 'supervisor',
            'status' => 'ativo',
        ]);

        Sanctum::actingAs($manager);

        $legalCase = $this->createLegalCase($operator, '60084600220268030001');

        $this->postJson('/api/cases/batch-update', [
            'case_ids' => [$legalCase->id],
            'action' => 'transfer_user',
            'value' => $supervisor->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('value');
    }

    public function test_administrator_can_delete_cases_in_batch(): void
    {
        $administrator = User::factory()->create([
            'role' => 'administrador',
            'status' => 'ativo',
        ]);

        $operator = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
        ]);

        Sanctum::actingAs($administrator);

        $firstCase = $this->createLegalCase($operator, '11111111111111111');
        $secondCase = $this->createLegalCase($operator, '22222222222222222');

        $this->postJson('/api/cases/batch-update', [
            'case_ids' => [$firstCase->id, $secondCase->id],
            'action' => 'delete',
        ])->assertOk()
            ->assertJsonPath('affected_count', 2);

        $this->assertDatabaseMissing('legal_cases', ['id' => $firstCase->id]);
        $this->assertDatabaseMissing('legal_cases', ['id' => $secondCase->id]);
    }

    public function test_non_administrator_cannot_delete_cases_in_batch(): void
    {
        $supervisor = User::factory()->create([
            'role' => 'supervisor',
            'status' => 'ativo',
        ]);

        $operator = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
        ]);

        Sanctum::actingAs($supervisor);

        $legalCase = $this->createLegalCase($operator, '33333333333333333');

        $this->postJson('/api/cases/batch-update', [
            'case_ids' => [$legalCase->id],
            'action' => 'delete',
        ])->assertForbidden()
            ->assertJsonPath('message', 'Apenas administradores podem excluir processos em lote.');

        $this->assertDatabaseHas('legal_cases', ['id' => $legalCase->id]);
    }

    private function createLegalCase(User $operator, string $caseNumber): LegalCase
    {
        $client = Client::firstOrCreate([
            'name' => 'Cliente de Atribuicao',
        ]);

        return LegalCase::create([
            'client_id' => $client->id,
            'user_id' => $operator->id,
            'case_number' => $caseNumber,
            'opposing_party' => 'Parte adversa',
            'defendant' => 'Parte re',
            'action_object' => 'Teste atribuicao',
            'status' => LegalCase::STATUS_INITIAL_ANALYSIS,
            'priority' => 'media',
            'original_value' => 1000,
            'cause_value' => 1000,
        ]);
    }
}
