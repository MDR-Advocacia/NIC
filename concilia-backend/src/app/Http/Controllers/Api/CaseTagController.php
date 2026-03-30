<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CaseTag;
use Illuminate\Http\JsonResponse;

class CaseTagController extends Controller
{
    public function index(): JsonResponse
    {
        $tags = CaseTag::query()
            ->orderBy('name')
            ->get()
            ->map(static fn (CaseTag $tag) => [
                'id' => $tag->id,
                'name' => $tag->name,
                'text' => $tag->name,
                'color' => CaseTag::sanitizeColor($tag->color),
            ])
            ->values();

        return response()->json($tags);
    }
}
