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

class DashboardController extends Controller
{
    private const TEAM_ROLES = ['operador', 'administrador', 'supervisor'];

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
        $closedCases = (int) ($kpiRow->closed_cases ?? 0);
        $conversionRate = $totalCases > 0 ? ($closedCases / $totalCases) * 100 : 0;

        $statusCounts = (clone $baseCasesQuery)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $indicationCasesQuery = clone $baseCasesQuery;
        $this->applyIndicationFilter($indicationCasesQuery);

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

        $recentCases = (clone $baseCasesQuery)
            ->with([
                'client:id,name',
                'lawyer:id,name',
            ])
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->limit(5)
            ->get([
                'id',
                'client_id',
                'user_id',
                'case_number',
                'opposing_party',
                'cause_value',
                'status',
                'start_date',
                'created_at',
                'updated_at',
            ]);

        return response()->json([
            'kpis' => [
                'total_cases' => $totalCases,
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
                LegalCase::STATUS_INDICATIONS => (int) ($statusCounts[LegalCase::STATUS_INDICATIONS] ?? 0),
                LegalCase::STATUS_CONTRA_INDICATED => (int) ($statusCounts[LegalCase::STATUS_CONTRA_INDICATED] ?? 0),
                LegalCase::STATUS_PROPOSAL_SENT => (int) ($statusCounts[LegalCase::STATUS_PROPOSAL_SENT] ?? 0),
                LegalCase::STATUS_IN_NEGOTIATION => (int) ($statusCounts[LegalCase::STATUS_IN_NEGOTIATION] ?? 0),
                LegalCase::STATUS_AWAITING_DRAFT => (int) ($statusCounts[LegalCase::STATUS_AWAITING_DRAFT] ?? 0),
                LegalCase::STATUS_CLOSED_DEAL => (int) ($statusCounts[LegalCase::STATUS_CLOSED_DEAL] ?? 0),
                LegalCase::STATUS_FAILED_DEAL => (int) ($statusCounts[LegalCase::STATUS_FAILED_DEAL] ?? 0),
            ],
            'monthly_evolution' => $this->buildMonthlyEvolution($request, $user, $dateRange),
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
                $closedDeals = (int) ($lawyer->closed_deals ?? 0);
                $economy = (float) ($lawyer->economy ?? 0);
                $conversionRate = $totalCases > 0 ? ($closedDeals / $totalCases) * 100 : 0;
                $score = ($closedDeals * 10) + ($economy / 1000);
                $productsCount = (int) ceil($closedDeals * 0.4);
                $productsValue = $productsCount * 2500;
                $productsEconomy = $economy > 0 ? ($economy * 0.15) : 0;

                return [
                    'id' => $lawyer->id,
                    'name' => $lawyer->name,
                    'total_cases' => $totalCases,
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

    private function newFilteredCaseQuery(
        Request $request,
        User $user,
        array $dateRange,
        string $dateColumn = 'created_at'
    ): Builder {
        $query = LegalCase::query();
        $this->applyCaseFilters($query, $request, $user, $dateRange, $dateColumn);

        return $query;
    }

    private function applyCaseFilters(
        Builder $query,
        Request $request,
        User $user,
        array $dateRange,
        string $dateColumn = 'created_at'
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
        string $dateColumn = 'created_at'
    ): void {
        $query->where('has_alcada', true);

        if ($request->filled('client_id')) {
            $query->where('client_id', (int) $request->input('client_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($dateRange['start'] instanceof Carbon) {
            $query->where($dateColumn, '>=', $dateRange['start']);
        }

        if ($dateRange['end'] instanceof Carbon) {
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

    private function applyIndicationFilter(Builder $query): void
    {
        $query->whereRaw("JSON_EXTRACT(agreement_checklist_data, '$.indication_checklist') IS NOT NULL");
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
}
