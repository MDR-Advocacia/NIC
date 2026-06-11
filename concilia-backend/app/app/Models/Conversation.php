<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Conversation extends Model
{
    use HasFactory;

    /**
     * Atributos que podem ser preenchidos em massa.
     * Unificamos todos os campos necessários aqui.
     */
    protected $fillable = [
        'chatwoot_id',      // Essencial para o Webhook identificar a conversa
        'contact_name',
        'contact_phone',
        'last_message',
        'status',
        'timestamp',
        'legal_case_id',    // Essencial para o vínculo jurídico
    ];

    /**
     * Relação: Uma conversa tem muitas mensagens.
     */
    public function chatMessages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }

    /**
     * Relação: Uma conversa pertence a um caso jurídico (LegalCase).
     */
    public function legalCase(): BelongsTo
    {
        return $this->belongsTo(LegalCase::class, 'legal_case_id');
    }
}