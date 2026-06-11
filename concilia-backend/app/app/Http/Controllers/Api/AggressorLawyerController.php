<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AggressorLawyer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AggressorLawyerController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = AggressorLawyer::query()
            ->with('clients');

        $query->when($request->search, function ($q, $search) {
            $q->where('name', 'like', "%{$search}%")
                ->orWhere('oab', 'like', "%{$search}%");
        });

        $aggressors = $query->orderBy('name')->paginate(15);

        return response()->json($aggressors);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // 1. Validação dos dados recebidos
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'oab' => 'required|string|max:255|unique:aggressor_lawyers,oab',
            'cpf' => 'nullable|string|max:14|unique:aggressor_lawyers,cpf',
            'demands_quantity' => 'nullable|integer|min:0',
            'observations' => 'nullable|string',
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'client_ids' => 'required|array',
            'client_ids.*' => 'exists:clients,id', // Garante que cada ID de cliente existe na tabela 'clients'
        ]);

        try {
            // 2. Inicia uma transação para garantir a consistência dos dados
            DB::beginTransaction();

            // 3. Cria o advogado com os dados validados
            $aggressor = AggressorLawyer::create($validatedData);

            // 4. Sincroniza os clientes (bancos afetados) com a tabela pivô
            $aggressor->clients()->sync($validatedData['client_ids']);

            // 5. Confirma a transação
            DB::commit();

            // 6. Retorna o advogado recém-criado com seus clientes
            return response()->json($aggressor->load('clients'), 201);
        } catch (\Exception $e) {
            // Em caso de erro, desfaz a transação
            DB::rollBack();
            // Retorna uma resposta de erro
            return response()->json(['message' => 'Erro ao salvar o advogado agressor.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(AggressorLawyer $aggressorLawyer)
    {
        // AINDA VAMOS IMPLEMENTAR
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, AggressorLawyer $aggressorLawyer)
    {
        // 1. Validação dos dados recebidos
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            // Regra 'unique' especial para atualização:
            // Ignora o ID do advogado atual na verificação de unicidade.
            'oab' => ['required', 'string', 'max:255', Rule::unique('aggressor_lawyers')->ignore($aggressorLawyer->id)],
            'cpf' => ['nullable', 'string', 'max:14', Rule::unique('aggressor_lawyers')->ignore($aggressorLawyer->id)],
            'demands_quantity' => 'nullable|integer|min:0',
            'observations' => 'nullable|string',
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'client_ids' => 'required|array',
            'client_ids.*' => 'exists:clients,id',
        ]);

        try {
            DB::beginTransaction();

            // 2. Atualiza o advogado com os dados validados
            $aggressorLawyer->update($validatedData);

            // 3. Sincroniza os clientes (bancos afetados)
            $aggressorLawyer->clients()->sync($validatedData['client_ids']);

            DB::commit();

            // 4. Retorna o advogado atualizado com seus clientes
            return response()->json($aggressorLawyer->load('clients'));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erro ao atualizar o advogado agressor.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(AggressorLawyer $aggressorLawyer)
    {

        $aggressorLawyer->delete();


        return response()->json(null, 204);
    }
}
