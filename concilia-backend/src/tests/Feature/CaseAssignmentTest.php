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
