<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const DEFAULT_TAG_COLOR = '#EF4444';

    public function up(): void
    {
        Schema::create('case_tags', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('color', 20)->default(self::DEFAULT_TAG_COLOR);
            $table->timestamps();
        });

        $this->backfillExistingCaseTags();
    }

    public function down(): void
    {
        Schema::dropIfExists('case_tags');
    }

    private function backfillExistingCaseTags(): void
    {
        if (!Schema::hasTable('legal_cases') || !Schema::hasColumn('legal_cases', 'tags')) {
            return;
        }

        $catalog = [];
        $timestamp = now();

        DB::table('legal_cases')
            ->select(['id', 'tags'])
            ->whereNotNull('tags')
            ->orderBy('id')
            ->chunkById(200, function ($cases) use (&$catalog, $timestamp) {
                foreach ($cases as $case) {
                    foreach ($this->normalizeTags($case->tags) as $tag) {
                        $normalizedKey = mb_strtolower($tag['text']);

                        if (isset($catalog[$normalizedKey])) {
                            continue;
                        }

                        $catalog[$normalizedKey] = [
                            'name' => $tag['text'],
                            'color' => $tag['color'],
                            'created_at' => $timestamp,
                            'updated_at' => $timestamp,
                        ];
                    }
                }
            }, 'id');

        if ($catalog !== []) {
            DB::table('case_tags')->upsert(array_values($catalog), ['name'], ['color', 'updated_at']);
        }
    }

    private function normalizeTags(mixed $tags): array
    {
        if ($tags === null || $tags === '') {
            return [];
        }

        if (is_string($tags)) {
            $decodedTags = json_decode($tags, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $tags = $decodedTags;
            }
        }

        if (!is_array($tags)) {
            return [];
        }

        $normalizedTags = [];
        $seenTexts = [];

        foreach ($tags as $tag) {
            $normalizedTag = $this->normalizeTag($tag);
            if ($normalizedTag === null) {
                continue;
            }

            $normalizedKey = mb_strtolower($normalizedTag['text']);
            if (isset($seenTexts[$normalizedKey])) {
                continue;
            }

            $seenTexts[$normalizedKey] = true;
            $normalizedTags[] = $normalizedTag;
        }

        return $normalizedTags;
    }

    private function normalizeTag(mixed $tag): ?array
    {
        if (is_string($tag)) {
            $text = trim($tag);
            $color = self::DEFAULT_TAG_COLOR;
        } elseif (is_array($tag)) {
            $text = trim((string) ($tag['text'] ?? $tag['name'] ?? ''));
            $color = trim((string) ($tag['color'] ?? self::DEFAULT_TAG_COLOR));
        } else {
            return null;
        }

        if ($text === '') {
            return null;
        }

        if ($color === '') {
            $color = self::DEFAULT_TAG_COLOR;
        }

        return [
            'text' => $text,
            'color' => $color,
        ];
    }
};
