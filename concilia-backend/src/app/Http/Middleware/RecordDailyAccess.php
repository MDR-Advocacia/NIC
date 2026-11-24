<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use App\Support\UserAgentDescriber;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Grava um "Acesso" no log na primeira requisição de cada usuário no dia (horário de Brasília).
 * O login fica salvo no navegador por semanas, então só o registro de login não mostra quem usou
 * o NIC no dia; este registro mostra.
 */
class RecordDailyAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $user = $request->user();
        if (!$user) {
            return $response;
        }

        $today = Carbon::now('America/Sao_Paulo');
        $cacheKey = "daily-access:{$user->id}:{$today->toDateString()}";

        // Caminho rápido: já registrado hoje (o cache é limpo nos deploys, por isso o banco confirma abaixo)
        if (!Cache::add($cacheKey, true, $today->copy()->endOfDay())) {
            return $response;
        }

        try {
            $startOfDayUtc = $today->copy()->startOfDay()->utc();
            $alreadyLogged = AuditLog::query()
                ->where('user_id', $user->id)
                ->whereIn('action', ['Acesso', 'Login'])
                ->where('created_at', '>=', $startOfDayUtc)
                ->exists();

            if (!$alreadyLogged) {
                $client = UserAgentDescriber::describe($request->userAgent());
                AuditLog::create([
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'action' => 'Acesso',
                    'details' => 'Primeiro acesso do dia' . ($client !== '' ? " ({$client})" : '') . '.',
                    'ip_address' => $request->ip(),
                ]);
            }
        } catch (\Throwable $exception) {
            report($exception);
        }

        return $response;
    }
}
