<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\BelongsTo; // ADICIONADO
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        // --- NOVOS CAMPOS ADICIONADOS ---
        'area',
        'status',
        'phone',
        'last_login_at',
        'department_id',
        'must_change_password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = ['password', 'remember_token'];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        
        'last_login_at' => 'datetime', // NOVO CAST ADICIONADO
        'must_change_password' => 'boolean',
    ];

    /**
     * Get the legal cases for the user.
     */
    public function legalCases(): HasMany
    {
        return $this->hasMany(LegalCase::class, 'lawyer_id');
    }

    /**
     * Get the department that the user belongs to.
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }
    // Relacionamento: Um usuário (advogado) tem vários casos
    public function cases()
    {
        return $this->hasMany(LegalCase::class, 'user_id');
    }

    public function indicatedCases(): HasMany
    {
        return $this->hasMany(LegalCase::class, 'indicator_user_id');
    }
}
