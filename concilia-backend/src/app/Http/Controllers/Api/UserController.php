<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule; // Importante para validação de update

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = User::with('department'); // Carrega o departamento junto

        // Filtros
        if ($request->has('search') && $request->input('search') != '') {
            $searchTerm = $request->input('search');
            $query->where('name', 'like', "%{$searchTerm}%")
                  ->orWhere('email', 'like', "%{$searchTerm}%");
        }
        if ($request->has('status') && $request->input('status') != '') {
            $query->where('status', $request->input('status'));
        }
        if ($request->has('role') && $request->input('role') != '') {
            $query->where('role', $request->input('role'));
        }
        if ($request->has('department_id') && $request->input('department_id') != '') {
            $query->where('department_id', $request->input('department_id'));
        }

        // Retorna todos os usuários (ou paginado, se preferir)
        return response()->json(['data' => $query->get()]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:administrador,supervisor,operador', // Valida as funções permitidas
            'department_id' => 'required|exists:departments,id', // Garante que o departamento existe
            'phone' => 'nullable|string',
            'status' => 'required|string|in:ativo,inativo',
        ]);

        // Criptografa a senha antes de salvar
        $validatedData['password'] = Hash::make($validatedData['password']);

        $user = User::create($validatedData);

        return response()->json($user, 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user)
    {
        $validatedData = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('users')->ignore($user->id)], // Permite manter o mesmo email
            'password' => 'nullable|string|min:8', // Senha é opcional na edição
            'role' => 'sometimes|required|string|in:administrador,supervisor,operador',
            'department_id' => 'sometimes|required|exists:departments,id',
            'phone' => 'nullable|string',
            'status' => 'sometimes|required|string|in:ativo,inativo',
        ]);

        // Só atualiza a senha se ela for enviada
        if (isset($validatedData['password']) && !empty($validatedData['password'])) {
            $validatedData['password'] = Hash::make($validatedData['password']);
        } else {
            unset($validatedData['password']); // Remove do array para não sobrescrever com vazio
        }

        $user->update($validatedData);

        return response()->json($user);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        $user->delete();
        return response()->json(null, 204);
    }
}