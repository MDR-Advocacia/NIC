<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ImportBatch extends Model
{
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'user_name',
        'file_name',
        'client_id',
        'created_count',
        'updated_count',
        'error_count',
        'undone_at',
    ];

    protected $casts = [
        'undone_at' => 'datetime',
    ];

    public function cases()
    {
        return $this->hasMany(LegalCase::class, 'import_batch_id');
    }
}
