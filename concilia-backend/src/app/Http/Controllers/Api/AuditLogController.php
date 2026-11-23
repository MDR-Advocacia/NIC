<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditLogController extends Controller
{
    // Ações de acesso ao sistema (gravadas pelo AuthController)
    public const ACCESS_ACTIONS = ['Login', 'Logout', 'Falha de login'];

    // Registro automático a cada abertura do pipeline: muito frequente, polui o histórico
    private const VIEW_ACTIONS = ['view_pipeline'];

    public function index(Request $request)
    {
        // A tela de logs é só de administrador; a API segue a mesma regra
        if (Auth::user()?->role !== 'administrador') {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $type = (string) $request->input('type', 'todos');
        $search = trim((string) $request->input('search', ''));
        $limit = min(max((int) $request->input('limit', 300), 1), 1000);

        $query = AuditLog::query()->orderByDesc('created_at')->orderByDesc('id');

        if ($type === 'acessos') {
            $query->whereIn('action', self::ACCESS_ACTIONS);
        } elseif ($type === 'alteracoes') {
            $query->whereNotIn('action', array_merge(self::ACCESS_ACTIONS, self::VIEW_ACTIONS));
        }

        if ($search !== '') {
            $query->where(function ($searchQuery) use ($search) {
                $like = "%{$search}%";
                $searchQuery->where('user_name', 'like', $like)
                    ->orWhere('action', 'like', $like)
                    ->orWhere('details', 'like', $like)
                    ->orWhere('ip_address', 'like', $like);
            });
        }

        return response()->json($query->take($limit)->get());
    }
}
