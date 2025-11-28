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
            AuditLog::create([
                'user_id' => Auth::check() ? Auth::id() : null,
                'action' => $action,
                'description' => $description,
                'details' => $details,
                'ip_address' => Request::ip(),
            ]);
        } catch (\Exception $e) {
            // Em produção, você logaria esse erro em arquivo, 
            // mas não queremos travar o sistema se o log falhar.
        }
    }
}