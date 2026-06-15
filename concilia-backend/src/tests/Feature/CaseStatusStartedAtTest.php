<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\LegalCase;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CaseStatusStartedAtTest extends TestCase
{
    use RefreshDatabase;

    public function test_status_started_at_updates_when_case_status_changes(): void
    {
        $operator = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
        ]);

        $legalCase = $this->createLegalCase($operator, '08011111120268205004');

        Carbon::setTestNow(Carbon::parse('2026-06-04 10:15:00'));

        try {
            $legalCase->update(['status' => LegalCase::STATUS_PROPOSAL_SENT]);
        } finally {
            Carbon::setTestNow();
        }

        $legalCase->refresh();

        $this->assertSame(LegalCase::STATUS_PROPOSAL_SENT, $legalCase->status);
        $this->assertSame('2026-06-04 10:15:00', $legalCase->status_started_at->format('Y-m-d H:i:s'));
    }

    public function test_batch_status_update_sets_status_started_at_and_history(): void
    {
        $manager = User::factory()->create([
            'role' => 'administrador',
            'status' => 'ativo',
        ]);

        $operator = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
        ]);

        $legalCase = $this->createLegalCase($operator, '08022222220268205004');

        Sanctum::actingAs($manager);
        Carbon::setTestNow(Carbon::parse('2026-06-04 11:30:00'));

        try {
            $this->postJson('/api/cases/batch-update', [
                'case_ids' => [$legalCase->id],
                'action' => 'update_status',
                'value' => LegalCase::STATUS_IN_NEGOTIATION,
            ])->assertOk()
                ->assertJsonPath('affected_count', 1);
        } finally {
            Carbon::setTestNow();
        }

        $legalCase->refresh();
        $history = $legalCase->histories()->first();

        $this->assertSame(LegalCase::STATUS_IN_NEGOTIATION, $legalCase->status);
        $this->assertSame('2026-06-04 11:30:00', $legalCase->status_started_at->format('Y-m-d H:i:s'));
        $this->assertNotNull($history);
        $this->assertSame('Status atualizado em lote.', $history->description);
        $this->assertSame(['status' => LegalCase::STATUS_INITIAL_ANALYSIS], $history->old_values);
        $this->assertSame(['status' => LegalCase::STATUS_IN_NEGOTIATION], $history->new_values);
    }

    private function createLegalCase(User $operator, string $caseNumber): LegalCase
    {
        $client = Client::firstOrCreate([
            'name' => 'Cliente Status Since',
        ]);

        return LegalCase::create([
            'client_id' => $client->id,
            'user_id' => $operator->id,
            'case_number' => $caseNumber,
            'opposing_party' => 'Parte adversa',
            'defendant' => 'Parte re',
            'action_object' => 'Teste status since',
            'status' => LegalCase::STATUS_INITIAL_ANALYSIS,
            'priority' => 'media',
            'original_value' => 1000,
            'cause_value' => 1000,
        ]);
    }
}
