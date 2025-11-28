<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo; // ADICIONE ESTA LINHA

class Conversation extends Model
{
    use HasFactory;

    /**
     * ADICIONADO: Atributos que podem ser preenchidos em massa.
     */
    protected $fillable = [
        'contact_name',
        'contact_phone',
        'last_message',
        'timestamp',
        'legal_case_id', // <-- O CAMPO MAIS IMPORTANTE PARA A CORREÇÃO
    ];

    /**
     * Get the chat messages for the conversation.
     */
    public function chatMessages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }

    /**
     * ADICIONADO (Opcional, mas recomendado): Define a relação inversa
     * Uma conversa pertence a um caso jurídico.
     */
    public function legalCase(): BelongsTo
    {
        return $this->belongsTo(LegalCase::class, 'legal_case_id');
    }
}