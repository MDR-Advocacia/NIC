<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Defendant;
use Illuminate\Http\Request;

class DefendantController extends Controller
{
    public function index(Request $request)
    {
        $query = Defendant::query();

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('cnpj', 'like', "%{$search}%");
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'cnpj' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
        ]);

        $defendant = Defendant::create($validated);
        return response()->json($defendant, 201);
    }
}