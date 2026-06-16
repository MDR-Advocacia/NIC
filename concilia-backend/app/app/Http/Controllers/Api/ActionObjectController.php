<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActionObject;
use App\Models\LegalCase;
use Illuminate\Http\Request;

class ActionObjectController extends Controller
{
    public function index(Request $request)
    {
        $query = ActionObject::query();

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
            'name' => 'required|string|max:255|unique:action_objects,name',
        ]);

        $actionObject = ActionObject::create([
            'name' => trim($validated['name']),
        ]);

        return response()->json($actionObject, 201);
    }

    public function update(Request $request, ActionObject $actionObject)
    {
        if ($request->has('name')) {
            $request->merge([
                'name' => trim((string) $request->input('name')),
            ]);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:action_objects,name,' . $actionObject->id,
        ]);

        $actionObject->update([
            'name' => trim($validated['name'] ?? $actionObject->name),
        ]);

        LegalCase::where('action_object_id', $actionObject->id)
            ->update(['action_object' => $actionObject->name]);

        return response()->json($actionObject);
    }
}
