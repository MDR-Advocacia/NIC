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
        'opposing_party', // Mantemos string para compatibilidade ou texto livre
        'plaintiff_id',   // NOVO: ID do Autor
        'defendant',      // Mantemos string
        'defendant_id',   // NOVO: ID do Réu
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

    public function lawyer()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
    
    public function opposingLawyer()
    {
        return $this->belongsTo(OpposingLawyer::class, 'opposing_lawyer_id');
    }

    // NOVOS RELACIONAMENTOS
    public function plaintiff()
    {
        return $this->belongsTo(Plaintiff::class, 'plaintiff_id');
    }

    public function defendantRel()
    {
        return $this->belongsTo(Defendant::class, 'defendant_id');
    }
}