<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContraIndicationReason;
use App\Models\LegalCase;
use Illuminate\Http\Request;

class ContraIndicationReasonController extends Controller
{
    public function index(Request $request)
    {
        $query = ContraIndicationReason::query();

        if ($request->filled('search')) {
            $search = trim((string) $request->get('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%");
            });
        }

        return response()->json($query->orderBy('category')->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
            'category' => trim((string) $request->input('category')),
        ]);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:contra_indication_reasons,name',
            'category' => 'required|string|max:255',
        ]);

        $reason = ContraIndicationReason::create([
            'name' => trim($validated['name']),
            'category' => trim($validated['category']),
        ]);

        return response()->json($reason, 201);
    }

    public function update(Request $request, ContraIndicationReason $contraIndicationReason)
    {
        if ($request->has('name')) {
            $request->merge([
                'name' => trim((string) $request->input('name')),
            ]);
        }

        if ($request->has('category')) {
            $request->merge([
                'category' => trim((string) $request->input('category')),
            ]);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:contra_indication_reasons,name,' . $contraIndicationReason->id,
            'category' => 'sometimes|required|string|max:255',
        ]);

        $oldName = $contraIndicationReason->name;

        $contraIndicationReason->update([
            'name' => trim($validated['name'] ?? $contraIndicationReason->name),
            'category' => trim($validated['category'] ?? $contraIndicationReason->category),
        ]);

        if (isset($validated['name']) && $validated['name'] !== $oldName) {
            LegalCase::where('contra_indication_reason_id', $contraIndicationReason->id)
                ->where('contra_indication_reason', $oldName)
                ->update(['contra_indication_reason' => $contraIndicationReason->name]);
        }

        return response()->json($contraIndicationReason);
    }
}
