<?php

namespace App\Models;

use App\Notifications\PasswordResetLinkNotification;
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
        'email_verified_at',
        'role',
        // --- NOVOS CAMPOS ADICIONADOS ---
        'area',
        'status',
        'phone',
        'last_login_at',
        'department_id',
        'must_change_password',
        'chatwoot_agent_id',
        'chatwoot_agent_name',
        'chatwoot_agent_email',
        'chatwoot_account_id',
        'chatwoot_role',
        'chatwoot_connected_at',
        'chatwoot_last_validated_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = ['password', 'remember_token', 'chatwoot_access_token'];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',

        'last_login_at' => 'datetime', // NOVO CAST ADICIONADO
        'must_change_password' => 'boolean',
        'chatwoot_access_token' => 'encrypted',
        'chatwoot_connected_at' => 'datetime',
        'chatwoot_last_validated_at' => 'datetime',
    ];

    protected $appends = ['chatwoot_connected'];

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

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new PasswordResetLinkNotification($token));
    }

    public function getChatwootConnectedAttribute(): bool
    {
        return filled($this->chatwoot_access_token) && filled($this->chatwoot_agent_id);
    }
}
