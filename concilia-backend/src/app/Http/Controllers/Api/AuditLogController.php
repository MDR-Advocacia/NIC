<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        // Segurança: Só admin pode ver logs
        if ($request->user()->role !== 'administrador') {
            return response()->json(['message' => 'Não autorizado'], 403);
        }

        // Retorna os últimos 100 logs com os dados do usuário que fez a ação
        $logs = AuditLog::with('user')
            ->latest()
            ->limit(100)
            ->get();

        return response()->json($logs);
    }
}