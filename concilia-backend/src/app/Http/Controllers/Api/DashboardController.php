<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LegalCase;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $baseQuery = $this->buildFilteredCasesQuery($request, $user);

        $totalCases = (clone $baseQuery)->count();
        $closedCasesQuery = (clone $baseQuery)->where('status', LegalCase::STATUS_CLOSED_DEAL);
        $closedCasesCount = (clone $closedCasesQuery)->count();
        $activeCasesCount = (clone $baseQuery)
            ->whereNotIn('status', LegalCase::TERMINAL_STATUSES)
            ->count();

        $totalAgreementValue = (float) ((clone $baseQuery)->sum('agreement_value') ?: 0);
        $totalOriginalValue = (float) ((clone $baseQuery)->sum('original_value') ?: 0);
        $totalEconomy = (float) (
            (clone $closedCasesQuery)
                ->selectRaw('COALESCE(SUM(COALESCE(original_value, 0) - COALESCE(agreement_value, 0)), 0) as total_economy')
                ->value('total_economy')
            ?: 0
        );

        $conversionRate = $totalCases > 0 ? ($closedCasesCount / $totalCases) * 100 : 0;

        $statusCounts = (clone $baseQuery)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'kpis' => [
                'total_cases' => $totalCases,
                'active_cases' => $activeCasesCount,
                'total_agreement_value' => $totalAgreementValue,
                'total_original_value' => $totalOriginalValue,
                'total_economy' => $totalEconomy,
                'conversion_rate' => number_format($conversionRate, 1, '.', '')
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
            'monthly_evolution' => $this->buildMonthlyEvolution($request, $user),
            'team_performance' => $this->buildTeamPerformance($request, $user),
            'recent_cases' => (clone $baseQuery)
                ->with(['client', 'lawyer'])
                ->latest('updated_at')
                ->limit(5)
                ->get(),
        ]);
    }

    private function buildFilteredCasesQuery(Request $request, User $user): Builder
    {
        $query = LegalCase::query();

        if ($user->role === 'operador') {
            $query->where('user_id', $user->id);
        } elseif ($request->filled('lawyer_id')) {
            $query->where('user_id', $request->input('lawyer_id'));
        }

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->input('client_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->input('start_date'));
        }

        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->input('end_date'));
        }

        return $query;
    }

    private function buildTeamPerformance(Request $request, User $user)
    {
        $lawyersQuery = User::query()->orderBy('name');

        if ($user->role === 'operador') {
            $lawyersQuery->where('id', $user->id);
        } else {
            $lawyersQuery->whereIn('role', ['operador', 'administrador', 'supervisor']);

            if ($request->filled('lawyer_id')) {
                $lawyersQuery->where('id', $request->input('lawyer_id'));
            }
        }

        $lawyers = $lawyersQuery->get(['id', 'name']);

        $caseAggregates = (clone $this->buildFilteredCasesQuery($request, $user))
            ->select('user_id')
            ->selectRaw('COUNT(*) as total_cases')
            ->selectRaw(
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as closed_deals',
                [LegalCase::STATUS_CLOSED_DEAL]
            )
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN status = ? THEN COALESCE(original_value, 0) - COALESCE(agreement_value, 0) ELSE 0 END), 0) as economy',
                [LegalCase::STATUS_CLOSED_DEAL]
            )
            ->groupBy('user_id')
            ->get()
            ->keyBy('user_id');

        return $lawyers
            ->map(function ($lawyer) use ($caseAggregates) {
                $aggregate = $caseAggregates->get($lawyer->id);
                $myTotal = (int) ($aggregate->total_cases ?? 0);
                $myClosed = (int) ($aggregate->closed_deals ?? 0);
                $myEconomy = (float) ($aggregate->economy ?? 0);
                $myConversion = $myTotal > 0 ? ($myClosed / $myTotal) * 100 : 0;
                $score = ($myClosed * 10) + ($myEconomy / 1000);

                $productsCount = (int) ceil($myClosed * 0.4);
                $productsValue = $productsCount * 2500;
                $productsEconomy = $myEconomy > 0 ? ($myEconomy * 0.15) : 0;

                return [
                    'id' => $lawyer->id,
                    'name' => $lawyer->name,
                    'total_cases' => $myTotal,
                    'closed_deals' => $myClosed,
                    'economy' => $myEconomy,
                    'conversion_rate' => round($myConversion, 1),
                    'score' => round($score, 1),
                    'products_count' => $productsCount,
                    'products_proposed_value' => $productsValue,
                    'products_economy' => $productsEconomy,
                ];
            })
            ->sortByDesc('score')
            ->values();
    }

    private function buildMonthlyEvolution(Request $request, User $user): array
    {
        $labels = [];
        $created = [];
        $closed = [];

        for ($i = 11; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $labels[] = $date->format('M');

            $created[] = (clone $this->buildFilteredCasesQuery($request, $user))
                ->whereYear('created_at', $date->year)
                ->whereMonth('created_at', $date->month)
                ->count();

            $closed[] = (clone $this->buildFilteredCasesQuery($request, $user))
                ->where('status', LegalCase::STATUS_CLOSED_DEAL)
                ->whereYear('updated_at', $date->year)
                ->whereMonth('updated_at', $date->month)
                ->count();
        }

        return [
            'labels' => $labels,
            'created' => $created,
            'closed' => $closed,
        ];
    }
}
