<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class AggressorLawyer extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'oab',
        'cpf',
        'demands_quantity',
        'observations',
        'status',
    ];

    /**
     * The clients (banks) that are affected by this aggressor lawyer.
     */
    public function clients(): BelongsToMany
    {
        return $this->belongsToMany(Client::class, 'aggressor_lawyer_client');
    }
}