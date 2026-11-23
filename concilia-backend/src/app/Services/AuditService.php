<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditService
{
    public static function log($action, $description, $details = null)
    {
        try {
            // A tabela não tem coluna "description": o texto vai em "details", junto com o nome do usuário
            AuditLog::create([
                'user_id' => Auth::check() ? Auth::id() : null,
                'user_name' => Auth::user()?->name,
                'action' => $action,
                'details' => $details ?? $description,
                'ip_address' => Request::ip(),
            ]);
        } catch (\Exception $e) {
            // Em produção, você logaria esse erro em arquivo, 
            // mas não queremos travar o sistema se o log falhar.
        }
    }
}