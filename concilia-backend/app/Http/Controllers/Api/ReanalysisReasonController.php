<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReanalysisReason;
use App\Models\LegalCase;
use Illuminate\Http\Request;

class ReanalysisReasonController extends Controller
{
    public function index(Request $request)
    {
        $query = ReanalysisReason::query();

        if ($request->filled('search')) {
            $search = trim((string) $request->get('search'));
            $query->where('name', 'like', "%{$search}%");
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
        ]);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:reanalysis_reasons,name',
        ]);

        $reason = ReanalysisReason::create([
            'name' => trim($validated['name']),
        ]);

        return response()->json($reason, 201);
    }

    public function update(Request $request, ReanalysisReason $reanalysisReason)
    {
        if ($request->has('name')) {
            $request->merge([
                'name' => trim((string) $request->input('name')),
            ]);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:reanalysis_reasons,name,' . $reanalysisReason->id,
        ]);

        $oldName = $reanalysisReason->name;

        $reanalysisReason->update([
            'name' => trim($validated['name'] ?? $reanalysisReason->name),
        ]);

        if (isset($validated['name']) && $validated['name'] !== $oldName) {
            LegalCase::where('reanalysis_reason_id', $reanalysisReason->id)
                ->where('reanalysis_reason', $oldName)
                ->update(['reanalysis_reason' => $reanalysisReason->name]);
        }

        return response()->json($reanalysisReason);
    }
}
