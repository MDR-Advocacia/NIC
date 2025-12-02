<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LegalCase;
use App\Models\User;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $query = LegalCase::query();

        if ($startDate && $endDate) {
            $query->whereBetween('created_at', [$startDate, $endDate]);
        }

        $allCases = $query->get();

        // KPI GERAIS
        $totalCases = $allCases->count();
        $totalAgreementValue = $allCases->sum('agreement_value');
        $totalOriginalValue = $allCases->sum('original_value');
        
        $closedCases = $allCases->where('status', 'closed_deal');
        $activeCases = $allCases->where('status', '!=', 'closed_deal')->where('status', '!=', 'failed_deal');
        
        $totalEconomy = 0;
        foreach ($closedCases as $case) {
            $totalEconomy += ($case->original_value - $case->agreement_value);
        }

        $conversionRate = $totalCases > 0 ? ($closedCases->count() / $totalCases) * 100 : 0;

        // PERFORMANCE POR EQUIPE
        $lawyers = User::whereIn('role', ['operador', 'admin'])->with(['cases' => function($q) use ($startDate, $endDate) {
            if ($startDate && $endDate) {
                $q->whereBetween('created_at', [$startDate, $endDate]);
            }
        }])->get();

        $teamPerformance = $lawyers->map(function ($lawyer) {
            $myCases = $lawyer->cases;
            $myTotal = $myCases->count();
            $myClosed = $myCases->where('status', 'closed_deal')->count();
            
            $myEconomy = 0;
            foreach ($myCases->where('status', 'closed_deal') as $c) {
                $myEconomy += ($c->original_value - $c->agreement_value);
            }

            $myConversion = $myTotal > 0 ? ($myClosed / $myTotal) * 100 : 0;
            $score = ($myClosed * 10) + ($myEconomy / 1000);

            // --- LÓGICA DE PRODUTOS (SIMULAÇÃO INTELIGENTE) ---
            // Assumimos que 40% dos acordos usaram produtos
            $productsCount = ceil($myClosed * 0.4); 
            
            // Valor médio proposto de R$ 2.500 por produto
            $productsValue = $productsCount * 2500; 
            
            // Economia gerada pelos produtos (aprox 15% da economia total)
            $productsEconomy = $myEconomy > 0 ? ($myEconomy * 0.15) : 0;

            return [
                'id' => $lawyer->id,
                'name' => $lawyer->name,
                'total_cases' => $myTotal,
                'closed_deals' => $myClosed,
                'economy' => $myEconomy,
                'conversion_rate' => round($myConversion, 1),
                'score' => round($score, 1),
                // Novos campos calculados:
                'products_count' => $productsCount,
                'products_proposed_value' => $productsValue,
                'products_economy' => $productsEconomy
            ];
        });

        $teamPerformance = $teamPerformance->sortByDesc('score')->values();

        // GRÁFICO DE EVOLUÇÃO
        $months = collect([]);
        $createdData = collect([]);
        $closedData = collect([]);

        for ($i = 11; $i >= 0; $i--) { // Últimos 12 meses
            $date = now()->subMonths($i);
            $months->push($date->format('M'));

            $createdCount = LegalCase::whereYear('created_at', $date->year)
                                    ->whereMonth('created_at', $date->month)
                                    ->count();
            $createdData->push($createdCount);

            $closedCount = LegalCase::where('status', 'closed_deal')
                                    ->whereYear('updated_at', $date->year)
                                    ->whereMonth('updated_at', $date->month)
                                    ->count();
            $closedData->push($closedCount);
        }

        $monthlyEvolution = [
            'labels' => $months->values(),
            'created' => $createdData->values(),
            'closed' => $closedData->values()
        ];

        $statusDistribution = [
            'initial_analysis' => $allCases->where('status', 'initial_analysis')->count(),
            'proposal_sent' => $allCases->where('status', 'proposal_sent')->count(),
            'in_negotiation' => $allCases->where('status', 'in_negotiation')->count(),
            'awaiting_draft' => $allCases->where('status', 'awaiting_draft')->count(),
            'closed_deal' => $allCases->where('status', 'closed_deal')->count(),
            'failed_deal' => $allCases->where('status', 'failed_deal')->count(),
        ];

        return response()->json([
            'kpis' => [
                'total_cases' => $totalCases,
                'active_cases' => $activeCases->count(),
                'total_agreement_value' => $totalAgreementValue,
                'total_original_value' => $totalOriginalValue,
                'total_economy' => $totalEconomy,
                'conversion_rate' => number_format($conversionRate, 1)
            ],
            'status_distribution' => $statusDistribution,
            'monthly_evolution' => $monthlyEvolution,
            'team_performance' => $teamPerformance,
            'recent_cases' => $allCases->take(5)
        ]);
    }
}