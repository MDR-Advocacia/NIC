<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index()
    {
        // Busca os logs ordenados do mais recente para o mais antigo
        // "with('user')" carrega os dados do usuário se existir a relação, mas vamos focar no básico
        $logs = AuditLog::orderBy('created_at', 'desc')->take(100)->get();

        return response()->json($logs);
    }
}