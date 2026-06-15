<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FailedDealReason;
use App\Models\LegalCase;
use Illuminate\Http\Request;

class FailedDealReasonController extends Controller
{
    public function index(Request $request)
    {
        $query = FailedDealReason::query();

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
            'name' => 'required|string|max:255|unique:failed_deal_reasons,name',
        ]);

        $reason = FailedDealReason::create([
            'name' => trim($validated['name']),
        ]);

        return response()->json($reason, 201);
    }

    public function update(Request $request, FailedDealReason $failedDealReason)
    {
        if ($request->has('name')) {
            $request->merge([
                'name' => trim((string) $request->input('name')),
            ]);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:failed_deal_reasons,name,' . $failedDealReason->id,
        ]);

        $oldName = $failedDealReason->name;

        $failedDealReason->update([
            'name' => trim($validated['name'] ?? $failedDealReason->name),
        ]);

        if (isset($validated['name']) && $validated['name'] !== $oldName) {
            LegalCase::where('failed_deal_reason_id', $failedDealReason->id)
                ->where('failed_deal_reason', $oldName)
                ->update(['failed_deal_reason' => $failedDealReason->name]);
        }

        return response()->json($failedDealReason);
    }
}
