<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\LegalCase;
use Carbon\Carbon; 

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'client_id' => 'nullable|integer|exists:clients,id',
            'lawyer_id' => 'nullable|integer|exists:users,id',
        ]);

        // --- Lógica de KPIs ---
        $query = LegalCase::query();

        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }
        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }
        if ($request->filled('lawyer_id')) {
            $query->where('lawyer_id', $request->lawyer_id);
        }

        $totalOriginalValue = (clone $query)->sum('original_value');
        $totalAgreementValue = (clone $query)->sum('agreement_value');
        $totalCases = (clone $query)->count();
        $economy = $totalOriginalValue - $totalAgreementValue;
        
        $finalStatuses = ['closed_deal', 'failed_deal'];
        $activeCases = (clone $query)->whereNotIn('status', $finalStatuses)->count();
        $closedDeals = (clone $query)->where('status', 'closed_deal')->count();
        
        $conversionRate = ($totalCases > 0) ? ($closedDeals / $totalCases) * 100 : 0;
        
        $statusDistribution = (clone $query)
            ->groupBy('status')
            ->select('status', DB::raw('count(*) as total'))
            ->pluck('total', 'status');
        // --- Fim KPIs ---


        // 2. --- NOVA LÓGICA PARA EVOLUÇÃO MENSAL ---
        $monthlyEvolutionData = [];
        // Inicializa os últimos 12 meses com 0 casos
        for ($i = 11; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i);
            // Formato 'Jan', 'Fev', etc.
            $monthlyEvolutionData[$month->shortLocaleMonth] = 0;
        }

        // Busca os dados do banco
        $monthlyCases = LegalCase::query()
            // Assumindo que o gráfico conta casos 'fechados'. Altere se necessário.
            ->where('status', 'closed_deal') 
            ->whereBetween('updated_at', [Carbon::now()->subMonths(11)->startOfMonth(), Carbon::now()->endOfMonth()])
            ->select(
                DB::raw('count(id) as total'),
                DB::raw("DATE_FORMAT(updated_at, '%b') as month_name")
            )
            ->groupBy('month_name')
            ->get()
            ->pluck('total', 'month_name');

        // Preenche o array com os dados do banco
        foreach ($monthlyCases as $monthName => $total) {
            // Garante que o nome do mês seja o mesmo formato (ex: Jan, Feb, etc.)
            $formattedMonthName = Carbon::createFromFormat('M', $monthName)->shortLocaleMonth;
            if (isset($monthlyEvolutionData[$formattedMonthName])) {
                $monthlyEvolutionData[$formattedMonthName] = $total;
            }
        }
        // --- FIM EVOLUÇÃO MENSAL ---


        // --- Lógica para casos recentes (mantida) ---
        $recentCases = LegalCase::with(['client', 'lawyer'])
            ->latest()
            ->take(10)
            ->get();
        // --- Fim casos recentes ---

        // 3. Resposta final combinando tudo
        return response()->json([
            'kpis' => [
                'total_original_value' => (float) $totalOriginalValue,
                'total_agreement_value' => (float) $totalAgreementValue,
                'total_economy' => (float) $economy,
                'total_cases' => $totalCases,
                'active_cases' => $activeCases,
                'conversion_rate' => round($conversionRate, 2),
            ],
            'status_distribution' => $statusDistribution,
            'recent_cases' => $recentCases,
            'monthly_evolution' => $monthlyEvolutionData, 
        ]);
    }
}