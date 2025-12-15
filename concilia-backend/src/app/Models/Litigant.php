<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Litigant extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'doc_number',
        'email',
        'phone',
    ];
}