<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LegalCase;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    private const TEAM_ROLES = ['operador', 'administrador', 'supervisor'];
    private const BRAZIL_STATES = [
        'AC' => 'Acre',
        'AL' => 'Alagoas',
        'AP' => 'Amapa',
        'AM' => 'Amazonas',
        'BA' => 'Bahia',
        'CE' => 'Ceara',
        'DF' => 'Distrito Federal',
        'ES' => 'Espirito Santo',
        'GO' => 'Goias',
        'MA' => 'Maranhao',
        'MT' => 'Mato Grosso',
        'MS' => 'Mato Grosso do Sul',
        'MG' => 'Minas Gerais',
        'PA' => 'Para',
        'PB' => 'Paraiba',
        'PR' => 'Parana',
        'PE' => 'Pernambuco',
        'PI' => 'Piaui',
        'RJ' => 'Rio de Janeiro',
        'RN' => 'Rio Grande do Norte',
        'RS' => 'Rio Grande do Sul',
        'RO' => 'Rondonia',
        'RR' => 'Roraima',
        'SC' => 'Santa Catarina',
        'SP' => 'Sao Paulo',
        'SE' => 'Sergipe',
        'TO' => 'Tocantins',
    ];

    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        if ($user->role === 'indicador') {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $dateRange = $this->resolveDateRange($request);
        $todayRange = $this->resolveTodayRange();
        $baseCasesQuery = $this->newFilteredCaseQuery($request, $user, $dateRange);

        $kpiRow = (clone $baseCasesQuery)
            ->selectRaw('COUNT(*) as total_cases')
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN status <> ? THEN 1 ELSE 0 END), 0) as worked_cases',
                [LegalCase::STATUS_INITIAL_ANALYSIS]
            )
            ->selectRaw('COALESCE(SUM(COALESCE(agreement_value, 0)), 0) as total_agreement_value')
            ->selectRaw('COALESCE(SUM(COALESCE(original_value, 0)), 0) as total_original_value')
            ->selectRaw(
                'COALESCE(AVG(CASE WHEN status = ? AND COALESCE(agreement_value, 0) > 0 THEN agreement_value END), 0) as average_ticket',
                [LegalCase::STATUS_CLOSED_DEAL]
            )
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN status = ? THEN COALESCE(original_value, 0) - COALESCE(agreement_value, 0) ELSE 0 END), 0) as total_economy',
                [LegalCase::STATUS_CLOSED_DEAL]
            )
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) as closed_cases',
                [LegalCase::STATUS_CLOSED_DEAL]
            )
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN status NOT IN (?, ?, ?) THEN 1 ELSE 0 END), 0) as active_cases',
                LegalCase::TERMINAL_STATUSES
            )
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN status = ? AND updated_at BETWEEN ? AND ? THEN 1 ELSE 0 END), 0) as closed_deals_today',
                [LegalCase::STATUS_CLOSED_DEAL, $todayRange['start'], $todayRange['end']]
            )
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN status = ? AND COALESCE(livelo_points, 0) > 0 THEN 1 ELSE 0 END), 0) as livelo_closed_deals',
                [LegalCase::STATUS_CLOSED_DEAL]
            )
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN status = ? AND COALESCE(ourocap_value, 0) > 0 THEN 1 ELSE 0 END), 0) as ourocap_closed_deals',
                [LegalCase::STATUS_CLOSED_DEAL]
            )
            ->first();

        $totalCases = (int) ($kpiRow->total_cases ?? 0);
        $workedCases = (int) ($kpiRow->worked_cases ?? 0);
        $closedCases = (int) ($kpiRow->closed_cases ?? 0);
        $conversionRate = $workedCases > 0 ? ($closedCases / $workedCases) * 100 : 0;

        $statusCounts = (clone $baseCasesQuery)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $indicationCasesQuery = LegalCase::query();
        $this->applyCaseFilters($indicationCasesQuery, $request, $user, $dateRange, null);
        $this->applyIndicationFilter($indicationCasesQuery, $dateRange);

        $indicationKpiRow = $indicationCasesQuery
            ->selectRaw('COUNT(*) as indications_received')
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) as agreements_via_indication',
                [LegalCase::STATUS_CLOSED_DEAL]
            )
            ->first();

        $indicationsReceived = (int) ($indicationKpiRow->indications_received ?? 0);
        $agreementsViaIndication = (int) ($indicationKpiRow->agreements_via_indication ?? 0);
        $indicationFlowConversionRate = $indicationsReceived > 0
            ? ($agreementsViaIndication / $indicationsReceived) * 100
            : 0;
        $indicatorLeaderboard = $this->buildIndicatorLeaderboard($request, $user, $dateRange);
        $recentCases = $this->buildRecentCases($request, $user, $dateRange);

        return response()->json([
            'kpis' => [
                'total_cases' => $totalCases,
                'worked_cases' => $workedCases,
                'active_cases' => (int) ($kpiRow->active_cases ?? 0),
                'closed_deals_today' => (int) ($kpiRow->closed_deals_today ?? 0),
                'total_agreement_value' => (float) ($kpiRow->total_agreement_value ?? 0),
                'total_original_value' => (float) ($kpiRow->total_original_value ?? 0),
                'average_ticket' => (float) ($kpiRow->average_ticket ?? 0),
                'total_economy' => (float) ($kpiRow->total_economy ?? 0),
                'livelo_closed_deals' => (int) ($kpiRow->livelo_closed_deals ?? 0),
                'ourocap_closed_deals' => (int) ($kpiRow->ourocap_closed_deals ?? 0),
                'conversion_rate' => number_format($conversionRate, 1),
            ],
            'indication_metrics' => [
                'indications_received' => $indicationsReceived,
                'agreements_via_indication' => $agreementsViaIndication,
                'indication_flow_conversion_rate' => number_format($indicationFlowConversionRate, 1),
            ],
            'status_distribution' => [
                LegalCase::STATUS_INITIAL_ANALYSIS => (int) ($statusCounts[LegalCase::STATUS_INITIAL_ANALYSIS] ?? 0),
                LegalCase::STATUS_CONTRA_INDICATED => (int) ($statusCounts[LegalCase::STATUS_CONTRA_INDICATED] ?? 0),
                LegalCase::STATUS_PROPOSAL_SENT => (int) ($statusCounts[LegalCase::STATUS_PROPOSAL_SENT] ?? 0),
                LegalCase::STATUS_IN_NEGOTIATION => (int) ($statusCounts[LegalCase::STATUS_IN_NEGOTIATION] ?? 0),
                LegalCase::STATUS_AWAITING_DRAFT => (int) ($statusCounts[LegalCase::STATUS_AWAITING_DRAFT] ?? 0),
                LegalCase::STATUS_CLOSED_DEAL => (int) ($statusCounts[LegalCase::STATUS_CLOSED_DEAL] ?? 0),
                LegalCase::STATUS_FAILED_DEAL => (int) ($statusCounts[LegalCase::STATUS_FAILED_DEAL] ?? 0),
            ],
            'monthly_evolution' => $this->buildMonthlyEvolution($request, $user, $dateRange),
            'agreements_by_state' => $this->buildAgreementsByState($request, $user, $dateRange),
            'agreement_macro_distribution' => $this->buildAgreementMacroDistribution($request, $user, $dateRange),
            'indicator_leaderboard' => $indicatorLeaderboard,
            'team_performance' => $this->buildTeamPerformance($request, $user, $dateRange),
            'recent_cases' => $recentCases,
        ]);
    }

    private function buildTeamPerformance(Request $request, User $user, array $dateRange): array
    {
        $lawyersQuery = User::query()
            ->select('users.id', 'users.name')
            ->selectRaw('COUNT(legal_cases.id) as total_cases')
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN legal_cases.status <> ? THEN 1 ELSE 0 END), 0) as worked_cases',
                [LegalCase::STATUS_INITIAL_ANALYSIS]
            )
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN legal_cases.status = ? THEN 1 ELSE 0 END), 0) as closed_deals',
                [LegalCase::STATUS_CLOSED_DEAL]
            )
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN legal_cases.status = ? THEN COALESCE(legal_cases.original_value, 0) - COALESCE(legal_cases.agreement_value, 0) ELSE 0 END), 0) as economy',
                [LegalCase::STATUS_CLOSED_DEAL]
            )
            ->leftJoin('legal_cases', function (JoinClause $join) use ($request, $dateRange) {
                $join->on('legal_cases.user_id', '=', 'users.id');
                $this->applySharedCaseJoinFilters($join, $request, $dateRange, 'legal_cases', 'created_at');
            });

        if ($user->role === 'operador') {
            $lawyersQuery->where('users.id', $user->id);
        } else {
            $lawyersQuery->whereIn('users.role', self::TEAM_ROLES);

            if ($request->filled('lawyer_id')) {
                $lawyersQuery->where('users.id', (int) $request->input('lawyer_id'));
            }
        }

        return $lawyersQuery
            ->groupBy('users.id', 'users.name')
            ->get()
            ->map(function (User $lawyer) {
                $totalCases = (int) ($lawyer->total_cases ?? 0);
                $workedCases = (int) ($lawyer->worked_cases ?? 0);
                $closedDeals = (int) ($lawyer->closed_deals ?? 0);
                $economy = (float) ($lawyer->economy ?? 0);
                $conversionRate = $workedCases > 0 ? ($closedDeals / $workedCases) * 100 : 0;
                $score = ($closedDeals * 10) + ($economy / 1000);
                $productsCount = (int) ceil($closedDeals * 0.4);
                $productsValue = $productsCount * 2500;
                $productsEconomy = $economy > 0 ? ($economy * 0.15) : 0;

                return [
                    'id' => $lawyer->id,
                    'name' => $lawyer->name,
                    'total_cases' => $totalCases,
                    'worked_cases' => $workedCases,
                    'closed_deals' => $closedDeals,
                    'economy' => $economy,
                    'conversion_rate' => round($conversionRate, 1),
                    'score' => round($score, 1),
                    'products_count' => $productsCount,
                    'products_proposed_value' => $productsValue,
                    'products_economy' => $productsEconomy,
                ];
            })
            ->sortByDesc('score')
            ->values()
            ->all();
    }

    private function buildMonthlyEvolution(Request $request, User $user, array $dateRange): array
    {
        $currentMonth = now()->startOfMonth();
        $windowStart = $currentMonth->copy()->subMonths(11);
        $windowEnd = $currentMonth->copy()->endOfMonth();

        $createdCounts = $this->newFilteredCaseQuery($request, $user, $dateRange, 'created_at')
            ->whereBetween('created_at', [$windowStart, $windowEnd])
            ->selectRaw('YEAR(created_at) as year_number, MONTH(created_at) as month_number, COUNT(*) as total')
            ->groupByRaw('YEAR(created_at), MONTH(created_at)')
            ->get()
            ->mapWithKeys(fn ($row) => [$this->buildMonthKey((int) $row->year_number, (int) $row->month_number) => (int) $row->total]);

        $closedCounts = $this->newFilteredCaseQuery($request, $user, $dateRange, 'updated_at')
            ->where('status', LegalCase::STATUS_CLOSED_DEAL)
            ->whereBetween('updated_at', [$windowStart, $windowEnd])
            ->selectRaw('YEAR(updated_at) as year_number, MONTH(updated_at) as month_number, COUNT(*) as total')
            ->groupByRaw('YEAR(updated_at), MONTH(updated_at)')
            ->get()
            ->mapWithKeys(fn ($row) => [$this->buildMonthKey((int) $row->year_number, (int) $row->month_number) => (int) $row->total]);

        $labels = [];
        $createdSeries = [];
        $closedSeries = [];

        for ($i = 11; $i >= 0; $i--) {
            $month = $currentMonth->copy()->subMonths($i);
            $monthKey = $this->buildMonthKey((int) $month->year, (int) $month->month);

            $labels[] = $month->format('M');
            $createdSeries[] = (int) ($createdCounts[$monthKey] ?? 0);
            $closedSeries[] = (int) ($closedCounts[$monthKey] ?? 0);
        }

        return [
            'labels' => $labels,
            'created' => $createdSeries,
            'closed' => $closedSeries,
        ];
    }

    private function buildAgreementsByState(Request $request, User $user, array $dateRange): array
    {
        $countsByState = $this->newClosedDealsQuery($request, $user, $dateRange, 'updated_at')
            ->whereNotNull('state')
            ->whereRaw("TRIM(state) <> ''")
            ->selectRaw('UPPER(TRIM(state)) as state_code, COUNT(*) as total')
            ->groupByRaw('UPPER(TRIM(state))')
            ->pluck('total', 'state_code');

        return collect(self::BRAZIL_STATES)
            ->map(fn (string $name, string $uf) => [
                'uf' => $uf,
                'name' => $name,
                'count' => (int) ($countsByState[$uf] ?? 0),
            ])
            ->values()
            ->all();
    }

    private function buildAgreementMacroDistribution(Request $request, User $user, array $dateRange): array
    {
        $savingsExpression = '(COALESCE(original_value, 0) - COALESCE(agreement_value, 0))';

        // As fatias precisam ser exclusivas para o grafico de pizza. A prioridade segue a ordem solicitada.
        $distribution = $this->newClosedDealsQuery($request, $user, $dateRange, 'updated_at')
            ->selectRaw(
                "COALESCE(SUM(CASE WHEN {$savingsExpression} > 5000 THEN 1 ELSE 0 END), 0) as high_savings"
            )
            ->selectRaw(
                "COALESCE(SUM(CASE WHEN {$savingsExpression} <= 5000 AND COALESCE(livelo_points, 0) > 0 THEN 1 ELSE 0 END), 0) as livelo"
            )
            ->selectRaw(
                "COALESCE(SUM(CASE WHEN {$savingsExpression} <= 5000 AND COALESCE(livelo_points, 0) = 0 AND COALESCE(ourocap_value, 0) > 0 THEN 1 ELSE 0 END), 0) as ourocap"
            )
            ->selectRaw(
                "COALESCE(SUM(CASE WHEN {$savingsExpression} <= 5000 AND COALESCE(livelo_points, 0) = 0 AND COALESCE(ourocap_value, 0) <= 0 THEN 1 ELSE 0 END), 0) as general"
            )
            ->first();

        return [
            [
                'key' => 'high_savings',
                'label' => 'Economia > R$ 5 mil',
                'value' => (int) ($distribution->high_savings ?? 0),
                'color' => '#166534',
            ],
            [
                'key' => 'livelo',
                'label' => 'Acordos Livelo',
                'value' => (int) ($distribution->livelo ?? 0),
                'color' => '#0ea5e9',
            ],
            [
                'key' => 'ourocap',
                'label' => 'Acordos Ourocap',
                'value' => (int) ($distribution->ourocap ?? 0),
                'color' => '#f59e0b',
            ],
            [
                'key' => 'general',
                'label' => 'Acordos Gerais',
                'value' => (int) ($distribution->general ?? 0),
                'color' => '#64748b',
            ],
        ];
    }

    private function buildIndicatorLeaderboard(Request $request, User $user, array $dateRange): array
    {
        $indicatorCasesQuery = LegalCase::query()
            ->leftJoin('users as indicators', 'indicators.id', '=', 'legal_cases.indicator_user_id')
            ->whereNotNull('legal_cases.indicator_user_id');

        $this->applyCaseFilters($indicatorCasesQuery, $request, $user, ['start' => null, 'end' => null], null);
        $this->applyIndicationFilter($indicatorCasesQuery, $dateRange);

        return $indicatorCasesQuery
            ->selectRaw('legal_cases.indicator_user_id as indicator_id')
            ->selectRaw("COALESCE(indicators.name, 'Indicador indisponivel') as indicator_name")
            ->selectRaw('COUNT(*) as indications_count')
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN legal_cases.status = ? THEN 1 ELSE 0 END), 0) as closed_deals',
                [LegalCase::STATUS_CLOSED_DEAL]
            )
            ->groupBy('legal_cases.indicator_user_id', 'indicators.name')
            ->orderByDesc('closed_deals')
            ->orderByDesc('indications_count')
            ->orderBy('indicator_name')
            ->get()
            ->map(function ($indicatorRow) {
                $indicationsCount = (int) ($indicatorRow->indications_count ?? 0);
                $closedDeals = (int) ($indicatorRow->closed_deals ?? 0);
                $conversionRate = $indicationsCount > 0 ? ($closedDeals / $indicationsCount) * 100 : 0;

                return [
                    'id' => (int) ($indicatorRow->indicator_id ?? 0),
                    'name' => $indicatorRow->indicator_name,
                    'indications_count' => $indicationsCount,
                    'closed_deals' => $closedDeals,
                    'conversion_rate' => round($conversionRate, 1),
                ];
            })
            ->values()
            ->all();
    }

    private function buildRecentCases(Request $request, User $user, array $dateRange)
    {
        $page = max((int) $request->integer('recent_cases_page', 1), 1);
        $perPage = $this->resolveRecentCasesPerPage($request);
        $recentEventDateRange = ['start' => null, 'end' => null];
        $historyConditionSql = $this->recentAlcadaHistoryConditionSql();

        $createdEventsQuery = $this->newFilteredCaseQuery($request, $user, $recentEventDateRange, null)
            ->whereNotExists(function ($query) use ($historyConditionSql) {
                $query
                    ->selectRaw('1')
                    ->from('case_histories')
                    ->whereColumn('case_histories.legal_case_id', 'legal_cases.id')
                    ->whereRaw($historyConditionSql);
            })
            ->selectRaw("legal_cases.id as legal_case_id, legal_cases.created_at as event_at, 'created' as event_type");

        if ($dateRange['start'] instanceof Carbon) {
            $createdEventsQuery->where('legal_cases.created_at', '>=', $dateRange['start']);
        }

        if ($dateRange['end'] instanceof Carbon) {
            $createdEventsQuery->where('legal_cases.created_at', '<=', $dateRange['end']);
        }

        $updatedEventsQuery = $this->newFilteredCaseQuery($request, $user, $recentEventDateRange, null)
            ->join('case_histories', 'case_histories.legal_case_id', '=', 'legal_cases.id')
            ->whereRaw($historyConditionSql)
            ->selectRaw("legal_cases.id as legal_case_id, case_histories.created_at as event_at, 'updated' as event_type");

        if ($dateRange['start'] instanceof Carbon) {
            $updatedEventsQuery->where('case_histories.created_at', '>=', $dateRange['start']);
        }

        if ($dateRange['end'] instanceof Carbon) {
            $updatedEventsQuery->where('case_histories.created_at', '<=', $dateRange['end']);
        }

        $allEventsQuery = $createdEventsQuery->unionAll($updatedEventsQuery);

        $latestEventsQuery = DB::query()
            ->fromSub($allEventsQuery, 'recent_alcada_events')
            ->selectRaw('legal_case_id, MAX(event_at) as event_at')
            ->groupBy('legal_case_id');

        return LegalCase::query()
            ->with([
                'client:id,name',
                'lawyer:id,name',
            ])
            ->joinSub($latestEventsQuery, 'recent_alcada', function (JoinClause $join) {
                $join->on('recent_alcada.legal_case_id', '=', 'legal_cases.id');
            })
            ->orderByDesc('recent_alcada.event_at')
            ->orderByDesc('legal_cases.id')
            ->paginate(
                $perPage,
                [
                    'legal_cases.id',
                    'legal_cases.client_id',
                    'legal_cases.user_id',
                    'legal_cases.case_number',
                    'legal_cases.opposing_party',
                    'legal_cases.cause_value',
                    'legal_cases.original_value',
                    'legal_cases.status',
                    'legal_cases.start_date',
                    'legal_cases.created_at',
                    'legal_cases.updated_at',
                    DB::raw('recent_alcada.event_at as recent_alcada_event_at'),
                    DB::raw("CASE WHEN legal_cases.created_at = recent_alcada.event_at THEN 'created' ELSE 'updated' END as recent_alcada_event_type"),
                ],
                'recent_cases_page',
                $page
            );
    }

    private function newFilteredCaseQuery(
        Request $request,
        User $user,
        array $dateRange,
        ?string $dateColumn = 'created_at'
    ): Builder {
        $query = LegalCase::query();
        $this->applyCaseFilters($query, $request, $user, $dateRange, $dateColumn);

        return $query;
    }

    private function newClosedDealsQuery(
        Request $request,
        User $user,
        array $dateRange,
        ?string $dateColumn = 'updated_at'
    ): Builder {
        $query = $this->newFilteredCaseQuery($request, $user, $dateRange, $dateColumn);
        $query->where('status', LegalCase::STATUS_CLOSED_DEAL);

        return $query;
    }

    private function resolveRecentCasesPerPage(Request $request): int
    {
        $perPage = (int) $request->integer('recent_cases_per_page', 20);

        return in_array($perPage, [20, 50], true) ? $perPage : 20;
    }

    private function applyCaseFilters(
        Builder $query,
        Request $request,
        User $user,
        array $dateRange,
        ?string $dateColumn = 'created_at'
    ): void {
        if ($user->role === 'operador') {
            $query->where('user_id', $user->id);
        } elseif ($request->filled('lawyer_id')) {
            $query->where('user_id', (int) $request->input('lawyer_id'));
        }

        $this->applySharedCaseFilters($query, $request, $dateRange, $dateColumn);
    }

    private function applySharedCaseFilters(
        Builder $query,
        Request $request,
        array $dateRange,
        ?string $dateColumn = 'created_at'
    ): void {
        $query->where('has_alcada', true);

        if ($request->filled('client_id')) {
            $query->where('client_id', (int) $request->input('client_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($dateColumn !== null && $dateRange['start'] instanceof Carbon) {
            $query->where($dateColumn, '>=', $dateRange['start']);
        }

        if ($dateColumn !== null && $dateRange['end'] instanceof Carbon) {
            $query->where($dateColumn, '<=', $dateRange['end']);
        }
    }

    private function applySharedCaseJoinFilters(
        JoinClause $join,
        Request $request,
        array $dateRange,
        string $table = 'legal_cases',
        string $dateColumn = 'created_at'
    ): void {
        $join->where("{$table}.has_alcada", '=', true);

        if ($request->filled('client_id')) {
            $join->where("{$table}.client_id", '=', (int) $request->input('client_id'));
        }

        if ($request->filled('status')) {
            $join->where("{$table}.status", '=', $request->input('status'));
        }

        if ($dateRange['start'] instanceof Carbon) {
            $join->where("{$table}.{$dateColumn}", '>=', $dateRange['start']);
        }

        if ($dateRange['end'] instanceof Carbon) {
            $join->where("{$table}.{$dateColumn}", '<=', $dateRange['end']);
        }
    }

    private function applyIndicationFilter(Builder $query, ?array $dateRange = null): void
    {
        $query->whereRaw("JSON_EXTRACT(agreement_checklist_data, '$.indication_checklist') IS NOT NULL");

        if ($dateRange === null) {
            return;
        }

        $indicationDateSql = $this->indicationCompletedDateSql();

        if (($dateRange['start'] ?? null) instanceof Carbon) {
            $query->whereRaw(
                "{$indicationDateSql} >= ?",
                [$dateRange['start']->toDateString()]
            );
        }

        if (($dateRange['end'] ?? null) instanceof Carbon) {
            $query->whereRaw(
                "{$indicationDateSql} <= ?",
                [$dateRange['end']->toDateString()]
            );
        }
    }

    private function resolveDateRange(Request $request): array
    {
        $startDate = $request->filled('start_date')
            ? Carbon::parse($request->input('start_date'))
            : null;
        $endDate = $request->filled('end_date')
            ? Carbon::parse($request->input('end_date'))
            : null;

        if ($startDate instanceof Carbon && $endDate instanceof Carbon && $startDate->gt($endDate)) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        return [
            'start' => $startDate?->startOfDay(),
            'end' => $endDate?->endOfDay(),
        ];
    }

    private function resolveTodayRange(): array
    {
        $today = now();

        return [
            'start' => $today->copy()->startOfDay(),
            'end' => $today->copy()->endOfDay(),
        ];
    }

    private function buildMonthKey(int $year, int $month): string
    {
        return sprintf('%04d-%02d', $year, $month);
    }

    private function indicationCompletedDateSql(string $column = 'agreement_checklist_data'): string
    {
        return "SUBSTR(JSON_UNQUOTE(JSON_EXTRACT({$column}, '$.indication_checklist.completed_at')), 1, 10)";
    }

    private function recentAlcadaHistoryConditionSql(string $table = 'case_histories'): string
    {
        $newOriginalValueSql = $this->historyDecimalSql("{$table}.new_values", '$.original_value');
        $oldOriginalValueSql = $this->historyDecimalSql("{$table}.old_values", '$.original_value');
        $newHasAlcadaSql = $this->historyBooleanSql("{$table}.new_values", '$.has_alcada');
        $oldHasAlcadaSql = $this->historyBooleanSql("{$table}.old_values", '$.has_alcada');

        return sprintf(
            '((COALESCE(%1$s, 0) > 0 AND COALESCE(%2$s, -1) <> COALESCE(%1$s, 0)) OR (%3$s = 1 AND %4$s = 0))',
            $newOriginalValueSql,
            $oldOriginalValueSql,
            $newHasAlcadaSql,
            $oldHasAlcadaSql
        );
    }

    private function historyDecimalSql(string $column, string $path): string
    {
        return "CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT({$column}, '{$path}')), '') AS DECIMAL(15, 2))";
    }

    private function historyBooleanSql(string $column, string $path): string
    {
        return "CASE WHEN LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT({$column}, '{$path}')), 'false')) IN ('1', 'true') THEN 1 ELSE 0 END";
    }
}
