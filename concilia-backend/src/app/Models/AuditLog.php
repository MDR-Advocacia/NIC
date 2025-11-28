<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'action',
        'description',
        'details',
        'ip_address',
    ];

    protected $casts = [
        'details' => 'array', // Converte JSON para Array automaticamente
    ];

    // Relação: Um log pertence a um usuário
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}