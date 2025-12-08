<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OpposingLawyer;
use Illuminate\Http\Request;

class OpposingLawyerController extends Controller
{
    // Listar (com busca simples)
    public function index(Request $request)
    {
        $query = OpposingLawyer::query();

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('oab', 'like', "%{$search}%");
        }

        return response()->json($query->orderBy('name')->get());
    }

    // Criar novo
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'cpf' => 'nullable|string|max:20',
            'oab' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
        ]);

        $lawyer = OpposingLawyer::create($validated);

        return response()->json($lawyer, 201);
    }
}