<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plaintiff extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'cpf_cnpj',
        'phone',
        'email'
    ];
}