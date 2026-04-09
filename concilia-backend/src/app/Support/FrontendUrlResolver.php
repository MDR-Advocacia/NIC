<?php

namespace App\Support;

use Illuminate\Support\Str;

class FrontendUrlResolver
{
    public static function resolve(?string $configuredUrl = null, ?string $fallbackUrl = null, ?string $requestBaseUrl = null): string
    {
        $configuredUrl = trim((string) $configuredUrl);
        $fallbackUrl = trim((string) $fallbackUrl);
        $requestBaseUrl = trim((string) $requestBaseUrl);

        if (self::isUsableFrontendUrl($configuredUrl)) {
            return rtrim($configuredUrl, '/');
        }

        foreach ([$requestBaseUrl, $fallbackUrl, $configuredUrl] as $candidate) {
            $derived = self::deriveFromBaseUrl($candidate);

            if ($derived !== null) {
                return $derived;
            }
        }

        return rtrim($configuredUrl ?: $fallbackUrl ?: 'http://localhost:5173', '/');
    }

    private static function isUsableFrontendUrl(string $url): bool
    {
        if ($url === '') {
            return false;
        }

        $host = parse_url($url, PHP_URL_HOST);

        if (! is_string($host) || $host === '') {
            return false;
        }

        return ! in_array(Str::lower($host), ['localhost', '127.0.0.1'], true);
    }

    private static function deriveFromBaseUrl(string $baseUrl): ?string
    {
        if ($baseUrl === '') {
            return null;
        }

        $scheme = parse_url($baseUrl, PHP_URL_SCHEME) ?: 'https';
        $host = parse_url($baseUrl, PHP_URL_HOST);

        if (! is_string($host) || $host === '') {
            return null;
        }

        $host = Str::lower($host);

        if (in_array($host, ['localhost', '127.0.0.1'], true)) {
            return "{$scheme}://{$host}:5173";
        }

        if (Str::startsWith($host, 'api-nic-lab.')) {
            return "{$scheme}://".preg_replace('/^api-nic-lab\./', 'lab-nic.', $host);
        }

        if (Str::startsWith($host, 'api-nic.')) {
            return "{$scheme}://".preg_replace('/^api-nic\./', 'nic.', $host);
        }

        if (Str::startsWith($host, 'api-')) {
            return "{$scheme}://".substr($host, 4);
        }

        if (Str::startsWith($host, 'api.')) {
            return "{$scheme}://".substr($host, 4);
        }

        return null;
    }
}
