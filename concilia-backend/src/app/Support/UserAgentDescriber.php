<?php

namespace App\Support;

/**
 * Navegador e sistema em poucas palavras ("Chrome no Windows"), a partir do User-Agent.
 */
class UserAgentDescriber
{
    public static function describe(?string $agent): string
    {
        $agent = (string) $agent;
        if ($agent === '') {
            return '';
        }

        $browser = match (true) {
            str_contains($agent, 'Edg/') => 'Edge',
            str_contains($agent, 'OPR/') => 'Opera',
            str_contains($agent, 'Chrome/') => 'Chrome',
            str_contains($agent, 'Firefox/') => 'Firefox',
            str_contains($agent, 'Safari/') => 'Safari',
            default => null,
        };
        $system = match (true) {
            str_contains($agent, 'Windows') => 'Windows',
            str_contains($agent, 'Android') => 'Android',
            str_contains($agent, 'iPhone') || str_contains($agent, 'iPad') => 'iOS',
            str_contains($agent, 'Mac OS') => 'macOS',
            str_contains($agent, 'Linux') => 'Linux',
            default => null,
        };

        return implode(' no ', array_filter([$browser, $system]));
    }
}
