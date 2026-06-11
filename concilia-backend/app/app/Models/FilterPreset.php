<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FilterPreset extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'filters',
        'is_global',
        'is_favorite',
    ];

    protected $casts = [
        'filters' => 'array',
        'is_global' => 'boolean',
        'is_favorite' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
