<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FilterPreset;
use Illuminate\Http\Request;

class FilterPresetController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $presets = FilterPreset::where('is_global', true)
            ->orWhere('user_id', $user->id)
            ->with('user:id,name')
            ->orderByDesc('is_favorite')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($presets);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'filters' => 'required|array',
            'is_global' => 'boolean',
        ]);

        $user = $request->user();
        $isGlobal = $request->boolean('is_global', false);

        if ($isGlobal && $user->role !== 'admin' && $user->role !== 'administrador') {
            return response()->json(['message' => 'Apenas administradores podem criar filtros globais.'], 403);
        }

        $preset = FilterPreset::create([
            'user_id' => $user->id,
            'name' => $request->input('name'),
            'filters' => $request->input('filters'),
            'is_global' => $isGlobal,
            'is_favorite' => false,
        ]);

        $preset->load('user:id,name');

        return response()->json($preset, 201);
    }

    public function destroy(Request $request, FilterPreset $filterPreset)
    {
        $user = $request->user();

        if ($filterPreset->user_id !== $user->id && $user->role !== 'admin' && $user->role !== 'administrador') {
            return response()->json(['message' => 'Sem permissão.'], 403);
        }

        $filterPreset->delete();

        return response()->json(['message' => 'Removido.']);
    }

    public function toggleFavorite(Request $request, FilterPreset $filterPreset)
    {
        $user = $request->user();

        if ($filterPreset->user_id !== $user->id && !$filterPreset->is_global) {
            return response()->json(['message' => 'Sem permissão.'], 403);
        }

        $filterPreset->is_favorite = !$filterPreset->is_favorite;
        $filterPreset->save();
        $filterPreset->load('user:id,name');

        return response()->json($filterPreset);
    }

    public function toggleGlobal(Request $request, FilterPreset $filterPreset)
    {
        $user = $request->user();

        if ($user->role !== 'admin' && $user->role !== 'administrador') {
            return response()->json(['message' => 'Apenas administradores podem alterar a visibilidade.'], 403);
        }

        $filterPreset->is_global = !$filterPreset->is_global;
        $filterPreset->save();
        $filterPreset->load('user:id,name');

        return response()->json($filterPreset);
    }
}
