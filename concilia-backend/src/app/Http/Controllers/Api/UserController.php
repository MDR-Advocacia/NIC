<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = User::with('department');

        // Filtros
        if ($request->has('search') && $request->input('search') != '') {
            $searchTerm = $request->input('search');
            $query->where(function($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                  ->orWhere('email', 'like', "%{$searchTerm}%");
            });
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
        // --- FILTRO DE ÁREA (NOVO) ---
        if ($request->has('area') && $request->input('area') != '') {
            $query->where('area', $request->input('area'));
        }

        return response()->json(['data' => $query->get()]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Adicionei 'area' na validação abaixo
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:administrador,supervisor,operador',
            'department_id' => 'required|exists:departments,id',
            'phone' => 'nullable|string',
            'status' => 'required|string|in:ativo,inativo',
            'area'   => 'nullable|string', // <--- AGORA O LARAVEL ACEITA A ÁREA
        ]);

        $validatedData['password'] = Hash::make($validatedData['password']);

        $user = User::create($validatedData);

        return response()->json($user, 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user)
    {
        // Adicionei 'area' na validação abaixo também
        $validatedData = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('users')->ignore($user->id)],
            'password' => 'nullable|string|min:8',
            'role' => 'sometimes|required|string|in:administrador,supervisor,operador',
            'department_id' => 'sometimes|required|exists:departments,id',
            'phone' => 'nullable|string',
            'status' => 'sometimes|required|string|in:ativo,inativo',
            'area'   => 'nullable|string', // <--- AGORA ACEITA NA EDIÇÃO TAMBÉM
        ]);

        if (isset($validatedData['password']) && !empty($validatedData['password'])) {
            $validatedData['password'] = Hash::make($validatedData['password']);
        } else {
            unset($validatedData['password']);
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