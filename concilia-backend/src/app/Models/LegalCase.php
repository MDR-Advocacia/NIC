<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LegalCase extends Model
{
    use HasFactory;
    protected $table = 'legal_cases';

    protected static function booted(): void
    {
        static::saving(function (self $legalCase) {
            $legalCase->has_alcada = $legalCase->resolveHasAlcadaFromOriginalValue();
        });
    }

    public const STATUS_INITIAL_ANALYSIS = 'initial_analysis';
    public const STATUS_CONTRA_INDICATED = 'contra_indicated';
    public const STATUS_PROPOSAL_SENT = 'proposal_sent';
    public const STATUS_IN_NEGOTIATION = 'in_negotiation';
    public const STATUS_AWAITING_DRAFT = 'awaiting_draft';
    public const STATUS_CLOSED_DEAL = 'closed_deal';
    public const STATUS_FAILED_DEAL = 'failed_deal';

    public const STATUSES = [
        self::STATUS_INITIAL_ANALYSIS,
        self::STATUS_CONTRA_INDICATED,
        self::STATUS_PROPOSAL_SENT,
        self::STATUS_IN_NEGOTIATION,
        self::STATUS_AWAITING_DRAFT,
        self::STATUS_CLOSED_DEAL,
        self::STATUS_FAILED_DEAL,
    ];

    public const TERMINAL_STATUSES = [
        self::STATUS_CONTRA_INDICATED,
        self::STATUS_CLOSED_DEAL,
        self::STATUS_FAILED_DEAL,
    ];

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
        'action_object_id',
        'description',
        'status',
        'priority',
        'original_value',
        'has_alcada',
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

    protected $casts = ['tags' => 'array', 'agreement_checklist_data' => 'array', 'has_alcada' => 'boolean'];

    private function resolveHasAlcadaFromOriginalValue(): bool
    {
        $originalValue = $this->original_value;

        if ($originalValue === null || $originalValue === '') {
            return false;
        }

        if (is_bool($originalValue)) {
            return $originalValue;
        }

        if (is_numeric($originalValue)) {
            return (float) $originalValue > 0;
        }

        $normalizedValue = trim((string) $originalValue);
        if ($normalizedValue === '') {
            return false;
        }

        if (strpos($normalizedValue, ',') !== false) {
            $normalizedValue = str_replace('.', '', $normalizedValue);
            $normalizedValue = str_replace(',', '.', $normalizedValue);
        }

        $normalizedValue = preg_replace('/[^\d.\-]/', '', $normalizedValue);

        if ($normalizedValue === '' || $normalizedValue === null) {
            return false;
        }

        return (float) $normalizedValue > 0;
    }

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

    public function actionObject()
    {
        return $this->belongsTo(ActionObject::class, 'action_object_id');
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
