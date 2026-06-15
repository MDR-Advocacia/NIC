<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    protected $table = 'audit_logs';

    protected $fillable = [
        'user_id',
        'user_name',
        'action',
        'details',
        'ip_address',
    ];

    // Relacionamento opcional com User (se quiser usar depois)
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}