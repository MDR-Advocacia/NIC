<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LegalCase extends Model
{
    use HasFactory;
    protected $table = 'legal_cases';

    /**
     * Get the history records for the legal case.
     */
    public function histories(): HasMany
    {
        return $this->hasMany(CaseHistory::class)->latest();
    }

    protected $fillable = [
        'case_number',
        'internal_number', 
        'client_id',
        'user_id',
        'opposing_party', // Campo de texto legado (Autor)
        'plaintiff_id',   // NOVO: ID da tabela Litigants (Autor)
        'defendant',      // Campo de texto legado (Réu)
        'defendant_id',   // NOVO: ID da tabela Litigants (Réu)
        'action_object',
        'description',
        'status',
        'priority',
        'original_value',
        'agreement_value',
        'cause_value',
        'updated_condemnation_value', 
        'opposing_lawyer_id',
        'comarca',
        'state',
        'city', 
        'special_court',
        'opposing_lawyer',
        'opposing_contact',
        'tags',
        'agreement_probability',
        'pcond_probability', 
        'agreement_checklist_data',
        'start_date'
    ];

    protected $casts = ['tags' => 'array', 'agreement_checklist_data' => 'array'];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    // MUDANÇA 2: Mantemos o nome da função 'lawyer' para o frontend não quebrar,
    // mas avisamos que no banco de dados a coluna se chama 'user_id'
    public function lawyer()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
    
    public function opposingLawyer()
    {
        return $this->belongsTo(OpposingLawyer::class, 'opposing_lawyer_id');
    }

    // NOVO: Relacionamento para o Autor (tabelado)
    public function plaintiffLitigant()
    {
        return $this->belongsTo(Litigant::class, 'plaintiff_id');
    }

    // NOVO: Relacionamento para o Réu (tabelado)
    public function defendantLitigant()
    {
        return $this->belongsTo(Litigant::class, 'defendant_id');
    }
}