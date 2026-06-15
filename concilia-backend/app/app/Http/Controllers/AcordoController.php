<?php

namespace App\Http\Controllers;

use App\Models\Acordo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth; // Importante para pegar o usuário logado

class AcordoController extends Controller
{
    /**
     * Display a listing of the resource.
     * Lista todos os acordos pertencentes ao usuário autenticado.
     */
    public function index()
    {
        // Pega todos os acordos onde o 'user_id' é igual ao ID do usuário logado
        $acordos = Acordo::where('user_id', Auth::id())->latest()->get();

        // Retorna a lista de acordos como uma resposta JSON
        return response()->json($acordos);
    }

    /**
     * Store a newly created resource in storage.
     * Salva um novo acordo no banco de dados.
     */
    public function store(Request $request)
    {
        // Validação dos dados recebidos do frontend
        $validatedData = $request->validate([
            'numero_processo' => 'required|string|max:255|unique:acordos',
            'nome_cliente' => 'required|string|max:255',
            'documento_cliente' => 'required|string|max:255',
            'valor_causa' => 'required|numeric|min:0',
            'valor_acordo' => 'required|numeric|min:0',
            'descricao' => 'nullable|string',
            'status' => 'sometimes|in:ativo,em_negociacao,finalizado,cancelado'
        ]);

        // Adiciona o ID do usuário logado aos dados validados
        $validatedData['user_id'] = Auth::id();

        // Cria o acordo no banco de dados
        $acordo = Acordo::create($validatedData);

        // Retorna o acordo recém-criado com um status de sucesso (201 Created)
        return response()->json($acordo, 201);
    }

    /**
     * Display the specified resource.
     * Mostra um único acordo específico.
     */
    public function show(Acordo $acordo)
    {
        // Verifica se o acordo pertence ao usuário logado (Segurança!)
        if ($acordo->user_id !== Auth::id()) {
            return response()->json(['message' => 'Acesso não autorizado'], 403); // 403 Forbidden
        }

        return response()->json($acordo);
    }

    /**
     * Update the specified resource in storage.
     * Atualiza um acordo existente.
     */
    public function update(Request $request, Acordo $acordo)
    {
        // Verifica se o acordo pertence ao usuário logado
        if ($acordo->user_id !== Auth::id()) {
            return response()->json(['message' => 'Acesso não autorizado'], 403);
        }

        // Valida os dados (aqui a regra 'unique' é um pouco diferente)
        $validatedData = $request->validate([
            'numero_processo' => 'required|string|max:255|unique:acordos,numero_processo,' . $acordo->id,
            'nome_cliente' => 'required|string|max:255',
            'documento_cliente' => 'required|string|max:255',
            'valor_causa' => 'required|numeric|min:0',
            'valor_acordo' => 'required|numeric|min:0',
            'descricao' => 'nullable|string',
            'status' => 'sometimes|in:ativo,em_negociacao,finalizado,cancelado'
        ]);

        // Atualiza o acordo com os novos dados
        $acordo->update($validatedData);

        // Retorna o acordo atualizado
        return response()->json($acordo);
    }

    /**
     * Remove the specified resource from storage.
     * Deleta um acordo.
     */
    public function destroy(Acordo $acordo)
    {
        // Verifica se o acordo pertence ao usuário logado
        if ($acordo->user_id !== Auth::id()) {
            return response()->json(['message' => 'Acesso não autorizado'], 403);
        }
        
        // Deleta o acordo do banco de dados
        $acordo->delete();

        // Retorna uma resposta vazia com status de sucesso (204 No Content)
        return response()->json(null, 204);
    }
}