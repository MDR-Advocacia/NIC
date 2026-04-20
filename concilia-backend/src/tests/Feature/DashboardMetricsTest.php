<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\CaseHistory;
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

    public function test_dashboard_returns_state_macro_and_indicator_breakdowns_for_closed_deals(): void
    {
        $manager = User::factory()->create([
            'role' => 'administrador',
            'status' => 'ativo',
        ]);

        $operator = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
        ]);

        $indicatorOne = User::factory()->create([
            'name' => 'Indicador Um',
            'role' => 'indicador',
            'status' => 'ativo',
        ]);

        $indicatorTwo = User::factory()->create([
            'name' => 'Indicador Dois',
            'role' => 'indicador',
            'status' => 'ativo',
        ]);

        Sanctum::actingAs($manager);

        $this->createLegalCase($operator, LegalCase::STATUS_CLOSED_DEAL, '08011957020268205004', [
            'state' => 'SP',
            'original_value' => 12000,
            'agreement_value' => 6000,
            'indicator_user_id' => $indicatorOne->id,
            'agreement_checklist_data' => [
                'indication_checklist' => [
                    'completed_at' => '2026-01-05T10:00:00-03:00',
                ],
            ],
        ]);

        $this->createLegalCase($operator, LegalCase::STATUS_CLOSED_DEAL, '06014605620248045300', [
            'state' => 'RJ',
            'original_value' => 3500,
            'agreement_value' => 3300,
            'livelo_points' => 9000,
            'indicator_user_id' => $indicatorOne->id,
            'agreement_checklist_data' => [
                'indication_checklist' => [
                    'completed_at' => '2026-01-10T10:00:00-03:00',
                ],
            ],
        ]);

        $this->createLegalCase($operator, LegalCase::STATUS_CLOSED_DEAL, '60084600220268030001', [
            'state' => 'RJ',
            'original_value' => 3000,
            'agreement_value' => 2800,
            'ourocap_value' => 750,
            'indicator_user_id' => $indicatorTwo->id,
            'agreement_checklist_data' => [
                'indication_checklist' => [
                    'completed_at' => '2026-01-15T10:00:00-03:00',
                ],
            ],
        ]);

        $this->createLegalCase($operator, LegalCase::STATUS_CLOSED_DEAL, '08000666820268205153', [
            'state' => 'MG',
            'original_value' => 4000,
            'agreement_value' => 3900,
        ]);

        $response = $this->getJson('/api/dashboard');

        $response
            ->assertOk()
            ->assertJsonFragment([
                'uf' => 'SP',
                'name' => 'Sao Paulo',
                'count' => 1,
            ])
            ->assertJsonFragment([
                'uf' => 'RJ',
                'name' => 'Rio de Janeiro',
                'count' => 2,
            ])
            ->assertJsonFragment([
                'uf' => 'MG',
                'name' => 'Minas Gerais',
                'count' => 1,
            ])
            ->assertJsonFragment([
                'key' => 'high_savings',
                'label' => 'Economia > R$ 5 mil',
                'value' => 1,
            ])
            ->assertJsonFragment([
                'key' => 'livelo',
                'label' => 'Acordos Livelo',
                'value' => 1,
            ])
            ->assertJsonFragment([
                'key' => 'ourocap',
                'label' => 'Acordos Ourocap',
                'value' => 1,
            ])
            ->assertJsonFragment([
                'key' => 'general',
                'label' => 'Acordos Gerais',
                'value' => 1,
            ])
            ->assertJsonFragment([
                'name' => 'Indicador Um',
                'indications_count' => 2,
                'closed_deals' => 2,
                'conversion_rate' => 100,
            ])
            ->assertJsonFragment([
                'name' => 'Indicador Dois',
                'indications_count' => 1,
                'closed_deals' => 1,
                'conversion_rate' => 100,
            ]);
    }

    public function test_dashboard_can_filter_cases_without_responsible(): void
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

        $this->createLegalCase($operator, LegalCase::STATUS_INITIAL_ANALYSIS, 'ASSIGNED-CASE');
        $unassignedCase = $this->createLegalCase($operator, LegalCase::STATUS_CLOSED_DEAL, 'UNASSIGNED-CASE', [
            'user_id' => null,
            'agreement_value' => 650,
        ]);

        $response = $this->getJson('/api/dashboard?lawyer_id=__unassigned__');

        $response
            ->assertOk()
            ->assertJsonPath('kpis.total_cases', 1)
            ->assertJsonPath('recent_cases.total', 1)
            ->assertJsonPath('recent_cases.data.0.case_number', $unassignedCase->case_number);
    }

    public function test_dashboard_recent_cases_follow_recent_alcada_events_with_pagination(): void
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

        for ($index = 1; $index <= 20; $index++) {
            $this->createLegalCase($operator, LegalCase::STATUS_INITIAL_ANALYSIS, sprintf('FILLER-%02d', $index), [
                'original_value' => 1000 + $index,
                'cause_value' => 1000 + $index,
                'created_at' => Carbon::parse(sprintf('2026-03-%02d 09:00:00', min($index, 28))),
            ]);
        }

        $createdWithAlcada = $this->createLegalCase($operator, LegalCase::STATUS_INITIAL_ANALYSIS, 'RECENT-CREATED', [
            'original_value' => 4800,
            'cause_value' => 4800,
            'created_at' => Carbon::parse('2026-04-05 09:00:00'),
        ]);

        $gainedAlcada = $this->createLegalCase($operator, LegalCase::STATUS_INITIAL_ANALYSIS, 'RECENT-GAINED', [
            'original_value' => 0,
            'cause_value' => 0,
            'created_at' => Carbon::parse('2026-03-10 09:00:00'),
        ]);
        $this->createHistoryEntry(
            $gainedAlcada,
            [
                'original_value' => 0,
                'has_alcada' => false,
            ],
            [
                'original_value' => 2500,
                'has_alcada' => true,
            ],
            Carbon::parse('2026-04-06 10:00:00')
        );
        $gainedAlcada->timestamps = false;
        $gainedAlcada->forceFill([
            'original_value' => 2500,
            'cause_value' => 2500,
            'updated_at' => Carbon::parse('2026-04-06 10:00:00'),
        ])->saveQuietly();

        $updatedAlcada = $this->createLegalCase($operator, LegalCase::STATUS_INITIAL_ANALYSIS, 'RECENT-UPDATED', [
            'original_value' => 1800,
            'cause_value' => 1800,
            'created_at' => Carbon::parse('2026-03-12 09:00:00'),
        ]);
        $this->createHistoryEntry(
            $updatedAlcada,
            [
                'original_value' => 1800,
                'has_alcada' => true,
            ],
            [
                'original_value' => 3200,
                'has_alcada' => true,
            ],
            Carbon::parse('2026-04-07 11:00:00')
        );
        $updatedAlcada->timestamps = false;
        $updatedAlcada->forceFill([
            'original_value' => 3200,
            'cause_value' => 3200,
            'updated_at' => Carbon::parse('2026-04-07 11:00:00'),
        ])->saveQuietly();

        $response = $this->getJson('/api/dashboard?recent_cases_per_page=20&recent_cases_page=1');

        $response
            ->assertOk()
            ->assertJsonPath('recent_cases.current_page', 1)
            ->assertJsonPath('recent_cases.per_page', 20)
            ->assertJsonPath('recent_cases.last_page', 2)
            ->assertJsonPath('recent_cases.total', 23)
            ->assertJsonPath('recent_cases.data.0.case_number', 'RECENT-UPDATED')
            ->assertJsonPath('recent_cases.data.0.recent_alcada_event_type', 'updated')
            ->assertJsonPath('recent_cases.data.1.case_number', 'RECENT-GAINED')
            ->assertJsonPath('recent_cases.data.1.recent_alcada_event_type', 'updated')
            ->assertJsonPath('recent_cases.data.2.case_number', 'RECENT-CREATED')
            ->assertJsonPath('recent_cases.data.2.recent_alcada_event_type', 'created');

        $secondPageResponse = $this->getJson('/api/dashboard?recent_cases_per_page=20&recent_cases_page=2');

        $secondPageResponse
            ->assertOk()
            ->assertJsonPath('recent_cases.current_page', 2)
            ->assertJsonCount(3, 'recent_cases.data');
    }

    public function test_dashboard_recent_cases_can_be_filtered_by_lawyer_without_ambiguous_user_id_errors(): void
    {
        $manager = User::factory()->create([
            'role' => 'administrador',
            'status' => 'ativo',
        ]);

        $targetOperator = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
        ]);

        $otherOperator = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
        ]);

        Sanctum::actingAs($manager);

        $this->createLegalCase($targetOperator, LegalCase::STATUS_INITIAL_ANALYSIS, 'FILTER-CREATED', [
            'original_value' => 1800,
            'cause_value' => 1800,
            'created_at' => Carbon::parse('2026-04-01 09:00:00'),
        ]);

        $updatedCase = $this->createLegalCase($targetOperator, LegalCase::STATUS_INITIAL_ANALYSIS, 'FILTER-UPDATED', [
            'original_value' => 1200,
            'cause_value' => 1200,
            'created_at' => Carbon::parse('2026-03-20 09:00:00'),
        ]);
        $this->createHistoryEntry(
            $updatedCase,
            [
                'original_value' => 1200,
                'has_alcada' => true,
            ],
            [
                'original_value' => 2400,
                'has_alcada' => true,
            ],
            Carbon::parse('2026-04-02 10:00:00')
        );
        $updatedCase->timestamps = false;
        $updatedCase->forceFill([
            'original_value' => 2400,
            'cause_value' => 2400,
            'updated_at' => Carbon::parse('2026-04-02 10:00:00'),
        ])->saveQuietly();

        $otherCase = $this->createLegalCase($otherOperator, LegalCase::STATUS_INITIAL_ANALYSIS, 'FILTER-OTHER', [
            'original_value' => 1500,
            'cause_value' => 1500,
            'created_at' => Carbon::parse('2026-04-03 09:00:00'),
        ]);
        $this->createHistoryEntry(
            $otherCase,
            [
                'original_value' => 1500,
                'has_alcada' => true,
            ],
            [
                'original_value' => 2600,
                'has_alcada' => true,
            ],
            Carbon::parse('2026-04-03 11:00:00')
        );

        $response = $this->getJson('/api/dashboard?lawyer_id=' . $targetOperator->id . '&recent_cases_per_page=20&recent_cases_page=1');

        $response
            ->assertOk()
            ->assertJsonPath('recent_cases.current_page', 1)
            ->assertJsonPath('recent_cases.total', 2)
            ->assertJsonPath('recent_cases.data.0.case_number', 'FILTER-UPDATED')
            ->assertJsonPath('recent_cases.data.0.recent_alcada_event_type', 'updated')
            ->assertJsonPath('recent_cases.data.1.case_number', 'FILTER-CREATED')
            ->assertJsonPath('recent_cases.data.1.recent_alcada_event_type', 'created');
    }

    public function test_dashboard_uses_agreement_closed_at_for_closed_deal_timeline_metrics(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-09 12:00:00'));

        try {
            $manager = User::factory()->create([
                'role' => 'administrador',
                'status' => 'ativo',
            ]);

            $operator = User::factory()->create([
                'role' => 'operador',
                'status' => 'ativo',
            ]);

            Sanctum::actingAs($manager);

            $this->createLegalCase($operator, LegalCase::STATUS_CLOSED_DEAL, 'CLOSE-DATE-REAL', [
                'agreement_value' => 950,
                'created_at' => Carbon::parse('2026-04-01 09:00:00'),
                'updated_at' => Carbon::parse('2026-02-10 14:00:00'),
                'agreement_closed_at' => '2026-04-09',
            ]);

            $response = $this->getJson('/api/dashboard?start_date=2026-04-01&end_date=2026-04-30');

            $response
                ->assertOk()
                ->assertJsonPath('kpis.closed_deals_today', 1)
                ->assertJsonPath('monthly_evolution.closed.11', 1);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_dashboard_separates_portfolio_and_closing_periods(): void
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

        $this->createLegalCase($operator, LegalCase::STATUS_IN_NEGOTIATION, 'PORTFOLIO-ONLY', [
            'original_value' => 1800,
            'cause_value' => 1800,
            'created_at' => Carbon::parse('2026-03-08 09:00:00'),
        ]);

        $this->createLegalCase($operator, LegalCase::STATUS_CLOSED_DEAL, 'CLOSING-ONLY', [
            'state' => 'SP',
            'original_value' => 2500,
            'agreement_value' => 1500,
            'created_at' => Carbon::parse('2026-02-20 09:00:00'),
            'updated_at' => Carbon::parse('2026-04-06 10:00:00'),
            'agreement_closed_at' => '2026-04-06',
        ]);

        $response = $this->getJson(
            '/api/dashboard?portfolio_start_date=2026-03-01&portfolio_end_date=2026-03-31'
            . '&closing_start_date=2026-04-01&closing_end_date=2026-04-30'
        );

        $response
            ->assertOk()
            ->assertJsonPath('kpis.total_cases', 1)
            ->assertJsonPath('kpis.active_cases', 1)
            ->assertJsonPath('kpis.total_original_value', 1800.0)
            ->assertJsonPath('kpis.total_agreement_value', 1500.0)
            ->assertJsonPath('kpis.total_economy', 1000.0)
            ->assertJsonPath('kpis.closed_deals_today', 1)
            ->assertJsonFragment([
                'uf' => 'SP',
                'name' => 'Sao Paulo',
                'count' => 1,
            ]);
    }

    public function test_dashboard_returns_day_week_and_month_metrics_for_general_responsible_and_indicator_views(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-15 10:00:00'));

        try {
            $manager = User::factory()->create([
                'role' => 'administrador',
                'status' => 'ativo',
            ]);

            $firstOperator = User::factory()->create([
                'name' => 'Responsavel Um',
                'role' => 'operador',
                'status' => 'ativo',
            ]);

            $secondOperator = User::factory()->create([
                'name' => 'Responsavel Dois',
                'role' => 'operador',
                'status' => 'ativo',
            ]);

            $firstIndicator = User::factory()->create([
                'name' => 'Indicador Um',
                'role' => 'indicador',
                'status' => 'ativo',
            ]);

            $secondIndicator = User::factory()->create([
                'name' => 'Indicador Dois',
                'role' => 'indicador',
                'status' => 'ativo',
            ]);

            Sanctum::actingAs($manager);

            $this->createLegalCase($firstOperator, LegalCase::STATUS_CLOSED_DEAL, 'VIEW-DAY', [
                'original_value' => 2000,
                'agreement_value' => 1200,
                'agreement_closed_at' => '2026-04-15',
                'indicator_user_id' => $firstIndicator->id,
                'agreement_checklist_data' => [
                    'indication_checklist' => [
                        'completed_at' => '2026-04-10T09:00:00-03:00',
                    ],
                ],
            ]);

            $this->createLegalCase($firstOperator, LegalCase::STATUS_CLOSED_DEAL, 'VIEW-WEEK', [
                'original_value' => 1600,
                'agreement_value' => 900,
                'agreement_closed_at' => '2026-04-14',
            ]);

            $this->createLegalCase($secondOperator, LegalCase::STATUS_CLOSED_DEAL, 'VIEW-MONTH', [
                'original_value' => 2600,
                'agreement_value' => 1500,
                'agreement_closed_at' => '2026-04-05',
                'indicator_user_id' => $secondIndicator->id,
                'agreement_checklist_data' => [
                    'indication_checklist' => [
                        'completed_at' => '2026-04-04T15:30:00-03:00',
                    ],
                ],
            ]);

            $this->createLegalCase($secondOperator, LegalCase::STATUS_CLOSED_DEAL, 'VIEW-OUTSIDE', [
                'agreement_value' => 800,
                'agreement_closed_at' => '2026-03-28',
                'indicator_user_id' => $firstIndicator->id,
                'agreement_checklist_data' => [
                    'indication_checklist' => [
                        'completed_at' => '2026-03-20T11:30:00-03:00',
                    ],
                ],
            ]);

            $response = $this->getJson('/api/dashboard');

            $response
                ->assertOk()
                ->assertJsonPath('view_metrics.general.day.period.start_date', '2026-04-15')
                ->assertJsonPath('view_metrics.general.day.summary.agreements_count', 1)
                ->assertJsonPath('view_metrics.general.day.summary.total_agreement_value', 1200.0)
                ->assertJsonPath('view_metrics.general.day.summary.average_ticket', 1200.0)
                ->assertJsonPath('view_metrics.general.day.summary.total_economy', 800.0)
                ->assertJsonPath('view_metrics.general.day.summary.converted_indications_count', 1)
                ->assertJsonPath('view_metrics.general.week.period.start_date', '2026-04-13')
                ->assertJsonPath('view_metrics.general.week.summary.agreements_count', 2)
                ->assertJsonPath('view_metrics.general.week.summary.total_agreement_value', 2100.0)
                ->assertJsonPath('view_metrics.general.week.summary.average_ticket', 1050.0)
                ->assertJsonPath('view_metrics.general.week.summary.total_economy', 1500.0)
                ->assertJsonPath('view_metrics.general.week.summary.converted_indications_count', 1)
                ->assertJsonPath('view_metrics.general.month.period.start_date', '2026-04-01')
                ->assertJsonPath('view_metrics.general.month.summary.agreements_count', 3)
                ->assertJsonPath('view_metrics.general.month.summary.total_agreement_value', 3600.0)
                ->assertJsonPath('view_metrics.general.month.summary.average_ticket', 1200.0)
                ->assertJsonPath('view_metrics.general.month.summary.total_economy', 2600.0)
                ->assertJsonPath('view_metrics.general.month.summary.converted_indications_count', 2)
                ->assertJsonPath('view_metrics.by_responsible.month.summary.participants_count', 2)
                ->assertJsonPath('view_metrics.by_responsible.month.items.0.name', 'Responsavel Um')
                ->assertJsonPath('view_metrics.by_responsible.month.items.0.agreements_count', 2)
                ->assertJsonPath('view_metrics.by_responsible.month.items.0.converted_indications_count', 1)
                ->assertJsonPath('view_metrics.by_responsible.month.items.1.name', 'Responsavel Dois')
                ->assertJsonPath('view_metrics.by_responsible.month.items.1.agreements_count', 1)
                ->assertJsonPath('view_metrics.by_responsible.month.items.1.converted_indications_count', 1)
                ->assertJsonPath('view_metrics.by_indicator.month.summary.participants_count', 2)
                ->assertJsonFragment([
                    'name' => 'Indicador Um',
                    'agreements_count' => 1,
                    'converted_indications_count' => 1,
                ])
                ->assertJsonFragment([
                    'name' => 'Indicador Dois',
                    'agreements_count' => 1,
                    'converted_indications_count' => 1,
                ]);
        } finally {
            Carbon::setTestNow();
        }
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

        if ($status === LegalCase::STATUS_CLOSED_DEAL && !array_key_exists('agreement_closed_at', $payload)) {
            $referenceDate = $overrides['updated_at'] ?? $overrides['created_at'] ?? now();
            $payload['agreement_closed_at'] = Carbon::parse($referenceDate)->toDateString();
        }

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

    private function createHistoryEntry(LegalCase $legalCase, array $oldValues, array $newValues, Carbon $createdAt): void
    {
        $historyEntry = CaseHistory::create([
            'legal_case_id' => $legalCase->id,
            'user_id' => $legalCase->user_id,
            'event_type' => 'update',
            'description' => 'Atualização de alçada para o dashboard.',
            'old_values' => $oldValues,
            'new_values' => $newValues,
        ]);

        $historyEntry->timestamps = false;
        $historyEntry->forceFill([
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ])->saveQuietly();
    }
}
