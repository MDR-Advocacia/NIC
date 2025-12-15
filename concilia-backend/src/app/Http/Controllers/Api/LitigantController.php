<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Litigant;
use Illuminate\Http\Request;

class LitigantController extends Controller
{
    /**
     * Lista os litigantes (Autores/Réus) com opção de busca.
     */
    public function index(Request $request)
    {
        $query = Litigant::query();

        if ($request->has('search') && $request->get('search') != '') {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('doc_number', 'like', "%{$search}%"); // Busca por CPF/CNPJ também
            });
        }

        return response()->json($query->orderBy('name')->get());
    }

    /**
     * Cria um novo litigante.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'nullable|string|in:PF,PJ',
            'doc_number' => 'nullable|string|max:20', // CPF ou CNPJ
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
        ]);

        $litigant = Litigant::create($validated);
        return response()->json($litigant, 201);
    }

    /**
     * Exibe um litigante específico.
     */
    public function show(Litigant $litigant)
    {
        return response()->json($litigant);
    }

    /**
     * Atualiza os dados de um litigante.
     */
    public function update(Request $request, Litigant $litigant)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'type' => 'nullable|string|in:PF,PJ',
            'doc_number' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
        ]);

        $litigant->update($validated);
        return response()->json($litigant);
    }

    /**
     * Remove um litigante (opcional, cuidado com vínculos).
     */
    public function destroy(Litigant $litigant)
    {
        // Verifica se existem casos vinculados antes de apagar (opcional)
        // if ($litigant->casesAsPlaintiff()->exists() || $litigant->casesAsDefendant()->exists()) { ... }

        $litigant->delete();
        return response()->json(null, 204);
    }
}