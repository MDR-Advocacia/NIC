<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    use HasFactory;
    protected $fillable = ['name'];

    public function legalCases(): HasMany
    {
        // Voltamos para o nome original
        return $this->hasMany(LegalCase::class);
    }
}