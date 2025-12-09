<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OpposingLawyer;
use Illuminate\Http\Request;

class OpposingLawyerController extends Controller
{
    public function index(Request $request)
    {
        $query = OpposingLawyer::query();

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('oab', 'like', "%{$search}%")
                  ->orWhere('cpf', 'like', "%{$search}%");
        }

        
        return response()->json($query->orderByDesc('is_abusive')->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'cpf' => 'nullable|string|max:20',
            'oab' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'is_abusive' => 'boolean'
        ]);

        $lawyer = OpposingLawyer::create($validated);
        return response()->json($lawyer, 201);
    }

    
    public function update(Request $request, OpposingLawyer $opposingLawyer)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'cpf' => 'nullable|string|max:20',
            'oab' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'is_abusive' => 'boolean'
        ]);

        $opposingLawyer->update($validated);
        return response()->json($opposingLawyer);
    }
}