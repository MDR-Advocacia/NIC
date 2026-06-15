<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CaseTag extends Model
{
    use HasFactory;

    public const DEFAULT_COLOR = '#EF4444';

    protected $fillable = [
        'name',
        'color',
    ];

    public static function normalizeTag(mixed $tag, ?string $fallbackColor = null): ?array
    {
        $resolvedFallbackColor = self::sanitizeColor($fallbackColor);

        if (is_string($tag)) {
            $text = trim($tag);
            $color = $resolvedFallbackColor;
        } elseif (is_array($tag)) {
            $text = trim((string) ($tag['text'] ?? $tag['name'] ?? ''));
            $color = self::sanitizeColor($tag['color'] ?? $resolvedFallbackColor);
        } elseif (is_object($tag)) {
            $text = trim((string) ($tag->text ?? $tag->name ?? ''));
            $color = self::sanitizeColor($tag->color ?? $resolvedFallbackColor);
        } else {
            return null;
        }

        if ($text === '') {
            return null;
        }

        return [
            'text' => $text,
            'color' => $color,
        ];
    }

    public static function normalizeCollection(mixed $tags, ?string $fallbackColor = null): array
    {
        if (!is_array($tags)) {
            return [];
        }

        $normalizedTags = [];
        $seenTexts = [];

        foreach ($tags as $tag) {
            $normalizedTag = self::normalizeTag($tag, $fallbackColor);

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

    public static function upsertFromCaseTags(mixed $tags): void
    {
        $normalizedTags = self::normalizeCollection($tags);
        if ($normalizedTags === []) {
            return;
        }

        $timestamp = now();
        $rows = array_map(
            static fn (array $tag) => [
                'name' => $tag['text'],
                'color' => self::sanitizeColor($tag['color'] ?? null),
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            $normalizedTags
        );

        self::query()->upsert($rows, ['name'], ['color', 'updated_at']);
    }

    public static function sanitizeColor(mixed $color): string
    {
        $normalizedColor = trim((string) ($color ?? ''));

        return $normalizedColor !== '' ? $normalizedColor : self::DEFAULT_COLOR;
    }
}
