<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\LegalCase;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardMetricsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_conversion_rate_uses_worked_cases_instead_of_all_cases(): void
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

        $this->createLegalCase($operator, LegalCase::STATUS_INITIAL_ANALYSIS, '08011957020268205004');
        $this->createLegalCase($operator, LegalCase::STATUS_IN_NEGOTIATION, '06014605620248045300');
        $this->createLegalCase($operator, LegalCase::STATUS_FAILED_DEAL, '60084600220268030001');
        $this->createLegalCase($operator, LegalCase::STATUS_CLOSED_DEAL, '08000666820268205153', [
            'agreement_value' => 750,
        ]);

        $response = $this->getJson('/api/dashboard?lawyer_id=' . $operator->id);

        $response
            ->assertOk()
            ->assertJsonPath('kpis.total_cases', 4)
            ->assertJsonPath('kpis.worked_cases', 3)
            ->assertJsonPath('kpis.conversion_rate', '33.3')
            ->assertJsonPath('team_performance.0.worked_cases', 3)
            ->assertJsonPath('team_performance.0.conversion_rate', 33.3);
    }

    public function test_dashboard_indication_flow_uses_the_indication_date_instead_of_case_creation_date(): void
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

        $this->createLegalCase($operator, LegalCase::STATUS_CLOSED_DEAL, '60973946720258030001', [
            'agreement_value' => 600,
            'created_at' => Carbon::parse('2025-12-20 09:00:00'),
            'updated_at' => Carbon::parse('2026-02-05 09:00:00'),
            'agreement_checklist_data' => [
                'indication_checklist' => [
                    'completed_at' => '2026-01-10T14:00:00-03:00',
                ],
            ],
        ]);

        $this->createLegalCase($operator, LegalCase::STATUS_IN_NEGOTIATION, '06591674420258041000', [
            'created_at' => Carbon::parse('2025-12-22 09:00:00'),
            'updated_at' => Carbon::parse('2026-01-18 09:00:00'),
            'agreement_checklist_data' => [
                'indication_checklist' => [
                    'completed_at' => '2026-01-18T11:30:00-03:00',
                ],
            ],
        ]);

        $this->createLegalCase($operator, LegalCase::STATUS_CLOSED_DEAL, '00217117520268041000', [
            'agreement_value' => 500,
            'created_at' => Carbon::parse('2025-12-15 09:00:00'),
            'updated_at' => Carbon::parse('2026-01-08 09:00:00'),
            'agreement_checklist_data' => [
                'indication_checklist' => [
                    'completed_at' => '2025-12-28T10:00:00-03:00',
                ],
            ],
        ]);

        $response = $this->getJson('/api/dashboard?start_date=2026-01-01&end_date=2026-01-31');

        $response
            ->assertOk()
            ->assertJsonPath('indication_metrics.indications_received', 2)
            ->assertJsonPath('indication_metrics.agreements_via_indication', 1)
            ->assertJsonPath('indication_metrics.indication_flow_conversion_rate', '50.0');
    }

    private function createLegalCase(User $operator, string $status, string $caseNumber, array $overrides = []): LegalCase
    {
        $client = Client::firstOrCreate([
            'name' => 'Cliente Dashboard',
        ]);

        $payload = array_merge([
            'client_id' => $client->id,
            'user_id' => $operator->id,
            'case_number' => $caseNumber,
            'opposing_party' => 'Parte adversa',
            'defendant' => 'Parte re',
            'action_object' => 'Teste dashboard',
            'status' => $status,
            'priority' => 'media',
            'original_value' => 1000,
            'cause_value' => 1000,
            'agreement_value' => null,
        ], array_diff_key($overrides, array_flip([
            'created_at',
            'updated_at',
        ])));

        $legalCase = LegalCase::create($payload);

        if (array_key_exists('created_at', $overrides) || array_key_exists('updated_at', $overrides)) {
            $legalCase->timestamps = false;
            $legalCase->forceFill([
                'created_at' => $overrides['created_at'] ?? $legalCase->created_at,
                'updated_at' => $overrides['updated_at'] ?? $legalCase->updated_at,
            ])->saveQuietly();
        }

        return $legalCase->fresh();
    }
}
