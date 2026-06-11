<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CaseTag;
use App\Models\LegalCase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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

    public function destroy(Request $request, CaseTag $caseTag): JsonResponse
    {
        $user = $request->user();
        if (!in_array($user?->role, ['administrador', 'admin'], true)) {
            return response()->json(['message' => 'Apenas administradores podem excluir etiquetas.'], 403);
        }

        $tagName = $caseTag->name;
        $normalizedTagKey = mb_strtolower($tagName);
        $affectedCases = 0;

        DB::beginTransaction();

        try {
            LegalCase::query()
                ->whereNotNull('tags')
                ->orderBy('id')
                ->chunkById(200, function ($cases) use ($normalizedTagKey, &$affectedCases) {
                    foreach ($cases as $legalCase) {
                        $currentTags = CaseTag::normalizeCollection($legalCase->tags ?? []);
                        if ($currentTags === []) {
                            continue;
                        }

                        $updatedTags = array_values(array_filter(
                            $currentTags,
                            static fn (array $tag) => mb_strtolower((string) ($tag['text'] ?? '')) !== $normalizedTagKey
                        ));

                        if ($updatedTags === $currentTags) {
                            continue;
                        }

                        $legalCase->update(['tags' => $updatedTags]);
                        $affectedCases++;
                    }
                });

            $caseTag->delete();

            try {
                AuditLog::create([
                    'user_id' => $user?->id,
                    'user_name' => $user?->name ?? 'Sistema',
                    'action' => 'Exclusão de Etiqueta',
                    'details' => "Excluiu a etiqueta '{$tagName}' e removeu de {$affectedCases} processo(s).",
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Exception $exception) {
                Log::error('Erro AuditLog case tag destroy: ' . $exception->getMessage());
            }

            DB::commit();

            return response()->json([
                'message' => "Etiqueta '{$tagName}' excluída com sucesso.",
                'removed_from_cases' => $affectedCases,
            ]);
        } catch (\Throwable $exception) {
            DB::rollBack();

            return response()->json([
                'message' => 'Não foi possível excluir a etiqueta.',
                'error' => $exception->getMessage(),
            ], 500);
        }
    }
}
