<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\LegalCase;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CaseReanalysisRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_indicator_can_request_reanalysis_from_failed_deal_and_becomes_case_indicator(): void
    {
        $indicator = $this->createUser('indicador');
        $previousIndicator = $this->createUser('indicador');
        $operator = $this->createUser('operador');
        $legalCase = $this->createLegalCase($operator, [
            'case_number' => '08088888820268205004',
            'status' => LegalCase::STATUS_FAILED_DEAL,
            'indicator_user_id' => $previousIndicator->id,
        ]);

        Sanctum::actingAs($indicator);
        Carbon::setTestNow(Carbon::parse('2026-06-04 15:30:00'));

        try {
            $this->postJson("/api/cases/{$legalCase->id}/request-reanalysis", [
                'reanalysis_reason' => 'A documentação foi complementada e permite nova avaliação.',
            ])
                ->assertOk()
                ->assertJsonPath('status', LegalCase::STATUS_INITIAL_ANALYSIS)
                ->assertJsonPath('indicator_user_id', $indicator->id)
                ->assertJsonPath('reanalysis_reason', 'A documentação foi complementada e permite nova avaliação.');
        } finally {
            Carbon::setTestNow();
        }

        $legalCase->refresh();

        $this->assertSame(LegalCase::STATUS_INITIAL_ANALYSIS, $legalCase->status);
        $this->assertSame($indicator->id, $legalCase->indicator_user_id);
        $this->assertSame('A documentação foi complementada e permite nova avaliação.', $legalCase->reanalysis_reason);
        $this->assertSame('2026-06-04 15:30:00', $legalCase->reanalysis_requested_at->format('Y-m-d H:i:s'));
        $this->assertSame($indicator->id, $legalCase->reanalysis_requested_by_user_id);
        $this->assertDatabaseHas('case_histories', [
            'legal_case_id' => $legalCase->id,
            'user_id' => $indicator->id,
            'description' => 'Reanálise solicitada pelo indicador.',
        ]);
    }

    public function test_indicator_can_request_reanalysis_from_contra_indicated_and_clears_reason(): void
    {
        $indicator = $this->createUser('indicador');
        $manager = $this->createUser('administrador');
        $operator = $this->createUser('operador');
        $legalCase = $this->createLegalCase($operator, [
            'case_number' => '08099999920268205004',
            'status' => LegalCase::STATUS_CONTRA_INDICATED,
            'contra_indication_reason' => 'Sem documentos suficientes para acordo.',
            'contra_indicated_at' => Carbon::parse('2026-06-04 15:00:00'),
            'contra_indicated_by_user_id' => $manager->id,
        ]);

        Sanctum::actingAs($indicator);

        $this->postJson("/api/cases/{$legalCase->id}/request-reanalysis", [
            'reanalysis_reason' => 'Há novos elementos para revisar a contraindicação.',
        ])
            ->assertOk()
            ->assertJsonPath('status', LegalCase::STATUS_INITIAL_ANALYSIS)
            ->assertJsonPath('contra_indication_reason', null)
            ->assertJsonPath('indicator_user_id', $indicator->id)
            ->assertJsonPath('reanalysis_reason', 'Há novos elementos para revisar a contraindicação.');

        $legalCase->refresh();

        $this->assertSame(LegalCase::STATUS_INITIAL_ANALYSIS, $legalCase->status);
        $this->assertSame($indicator->id, $legalCase->indicator_user_id);
        $this->assertNull($legalCase->contra_indication_reason);
        $this->assertNull($legalCase->contra_indicated_at);
        $this->assertNull($legalCase->contra_indicated_by_user_id);
        $this->assertSame('Há novos elementos para revisar a contraindicação.', $legalCase->reanalysis_reason);
    }

    public function test_reanalysis_request_requires_reason(): void
    {
        $indicator = $this->createUser('indicador');
        $operator = $this->createUser('operador');
        $legalCase = $this->createLegalCase($operator, [
            'case_number' => '08100000020268205004',
            'status' => LegalCase::STATUS_FAILED_DEAL,
        ]);

        Sanctum::actingAs($indicator);

        $this->postJson("/api/cases/{$legalCase->id}/request-reanalysis", [
            'reanalysis_reason' => '   ',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('reanalysis_reason');

        $legalCase->refresh();

        $this->assertSame(LegalCase::STATUS_FAILED_DEAL, $legalCase->status);
        $this->assertNull($legalCase->reanalysis_reason);
    }

    public function test_reanalysis_request_is_limited_to_reanalysis_statuses(): void
    {
        $indicator = $this->createUser('indicador');
        $operator = $this->createUser('operador');
        $legalCase = $this->createLegalCase($operator, [
            'case_number' => '08111111120268205004',
            'status' => LegalCase::STATUS_IN_NEGOTIATION,
        ]);

        Sanctum::actingAs($indicator);

        $this->postJson("/api/cases/{$legalCase->id}/request-reanalysis", [
            'reanalysis_reason' => 'Pedido fora do status permitido.',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Somente casos Contra Indicados ou com Acordo Frustrado podem ser enviados para reanálise.');

        $legalCase->refresh();

        $this->assertSame(LegalCase::STATUS_IN_NEGOTIATION, $legalCase->status);
    }

    public function test_operator_cannot_request_reanalysis(): void
    {
        $operator = $this->createUser('operador');
        $legalCase = $this->createLegalCase($operator, [
            'case_number' => '08122222220268205004',
            'status' => LegalCase::STATUS_FAILED_DEAL,
        ]);

        Sanctum::actingAs($operator);

        $this->postJson("/api/cases/{$legalCase->id}/request-reanalysis", [
            'reanalysis_reason' => 'Operador tentando solicitar reanálise.',
        ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado.');

        $legalCase->refresh();

        $this->assertSame(LegalCase::STATUS_FAILED_DEAL, $legalCase->status);
    }

    private function createUser(string $role): User
    {
        return User::factory()->create([
            'role' => $role,
            'status' => 'ativo',
        ]);
    }

    private function createLegalCase(User $operator, array $overrides = []): LegalCase
    {
        $client = Client::firstOrCreate([
            'name' => 'Cliente Reanalise',
        ]);

        return LegalCase::create(array_merge([
            'client_id' => $client->id,
            'user_id' => $operator->id,
            'case_number' => '08000000020268205004',
            'opposing_party' => 'Parte adversa',
            'defendant' => 'Parte re',
            'action_object' => 'Teste reanalise',
            'status' => LegalCase::STATUS_FAILED_DEAL,
            'priority' => 'media',
            'original_value' => 1000,
            'cause_value' => 1000,
        ], $overrides));
    }
}
