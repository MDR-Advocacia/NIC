<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OpposingLawyer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'cpf',
        'oab',
        'phone',
        'email',
        'is_abusive' 
    ];

    protected $casts = [
        'is_abusive' => 'boolean',
    ];
}