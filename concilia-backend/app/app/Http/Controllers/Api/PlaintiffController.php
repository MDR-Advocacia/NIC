<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plaintiff;
use Illuminate\Http\Request;

class PlaintiffController extends Controller
{
    public function index(Request $request)
    {
        $query = Plaintiff::query();

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('cpf_cnpj', 'like', "%{$search}%");
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'cpf_cnpj' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
        ]);

        $plaintiff = Plaintiff::create($validated);
        return response()->json($plaintiff, 201);
    }
}