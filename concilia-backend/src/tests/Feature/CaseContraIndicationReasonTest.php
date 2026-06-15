<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\LegalCase;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CaseContraIndicationReasonTest extends TestCase
{
    use RefreshDatabase;

    public function test_contra_indication_requires_reason(): void
    {
        $manager = User::factory()->create([
            'role' => 'administrador',
            'status' => 'ativo',
        ]);
        $operator = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
        ]);
        $legalCase = $this->createLegalCase($operator, '08055555520268205004');

        Sanctum::actingAs($manager);

        $this->putJson("/api/cases/{$legalCase->id}", [
            'status' => LegalCase::STATUS_CONTRA_INDICATED,
            'contra_indication_reason' => '   ',
        ])->assertStatus(422)
            ->assertJsonValidationErrors('contra_indication_reason');

        $legalCase->refresh();

        $this->assertSame(LegalCase::STATUS_INITIAL_ANALYSIS, $legalCase->status);
        $this->assertNull($legalCase->contra_indication_reason);
    }

    public function test_contra_indication_reason_is_stored_on_status_update(): void
    {
        $manager = User::factory()->create([
            'role' => 'administrador',
            'status' => 'ativo',
        ]);
        $operator = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
        ]);
        $legalCase = $this->createLegalCase($operator, '08066666620268205004');

        Sanctum::actingAs($manager);
        Carbon::setTestNow(Carbon::parse('2026-06-04 14:30:00'));

        try {
            $this->putJson("/api/cases/{$legalCase->id}", [
                'status' => LegalCase::STATUS_CONTRA_INDICATED,
                'contra_indication_reason' => 'Documentos insuficientes para sustentar acordo.',
            ])->assertOk()
                ->assertJsonPath('status', LegalCase::STATUS_CONTRA_INDICATED)
                ->assertJsonPath('contra_indication_reason', 'Documentos insuficientes para sustentar acordo.');
        } finally {
            Carbon::setTestNow();
        }

        $legalCase->refresh();

        $this->assertSame(LegalCase::STATUS_CONTRA_INDICATED, $legalCase->status);
        $this->assertSame('Documentos insuficientes para sustentar acordo.', $legalCase->contra_indication_reason);
        $this->assertSame('2026-06-04 14:30:00', $legalCase->contra_indicated_at->format('Y-m-d H:i:s'));
        $this->assertSame($manager->id, $legalCase->contra_indicated_by_user_id);
    }

    public function test_batch_contra_indication_stores_shared_reason(): void
    {
        $manager = User::factory()->create([
            'role' => 'administrador',
            'status' => 'ativo',
        ]);
        $operator = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
        ]);
        $legalCase = $this->createLegalCase($operator, '08077777720268205004');

        Sanctum::actingAs($manager);

        $this->postJson('/api/cases/batch-update', [
            'case_ids' => [$legalCase->id],
            'action' => 'update_status',
            'value' => LegalCase::STATUS_CONTRA_INDICATED,
            'contra_indication_reason' => 'Restrição de política interna.',
        ])->assertOk()
            ->assertJsonPath('affected_count', 1);

        $legalCase->refresh();

        $this->assertSame(LegalCase::STATUS_CONTRA_INDICATED, $legalCase->status);
        $this->assertSame('Restrição de política interna.', $legalCase->contra_indication_reason);
        $this->assertSame($manager->id, $legalCase->contra_indicated_by_user_id);
    }

    private function createLegalCase(User $operator, string $caseNumber): LegalCase
    {
        $client = Client::firstOrCreate([
            'name' => 'Cliente Contraindicacao',
        ]);

        return LegalCase::create([
            'client_id' => $client->id,
            'user_id' => $operator->id,
            'case_number' => $caseNumber,
            'opposing_party' => 'Parte adversa',
            'defendant' => 'Parte re',
            'action_object' => 'Teste contraindicação',
            'status' => LegalCase::STATUS_INITIAL_ANALYSIS,
            'priority' => 'media',
            'original_value' => 1000,
            'cause_value' => 1000,
        ]);
    }
}
