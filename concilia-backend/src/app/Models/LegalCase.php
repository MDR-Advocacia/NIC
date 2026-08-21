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

            if (!$legalCase->exists && empty($legalCase->status_started_at)) {
                $legalCase->status_started_at = now();
            } elseif ($legalCase->exists && $legalCase->isDirty('status')) {
                $legalCase->status_started_at = now();
            } elseif (empty($legalCase->status_started_at)) {
                $legalCase->status_started_at = $legalCase->created_at ?: now();
            }
        });
    }

    public const STATUS_INITIAL_ANALYSIS = 'initial_analysis';
    public const STATUS_INDICATIONS = 'indications';
    public const STATUS_CONTRA_INDICATED = 'contra_indicated';
    public const STATUS_PROPOSAL_SENT = 'proposal_sent';
    public const STATUS_IN_NEGOTIATION = 'in_negotiation';
    public const STATUS_AWAITING_DRAFT = 'awaiting_draft';
    public const STATUS_CLOSED_DEAL = 'closed_deal';
    public const STATUS_FAILED_DEAL = 'failed_deal';
    public const STATUS_CLOSED_IN_HEARING = 'closed_in_hearing';
    public const STATUS_PENDING_PAYMENT = 'pending_payment';
    public const STATUS_PENDING_OBF = 'pending_obf';
    public const STATUS_PENDING_LIVELO_OUROCAP = 'pending_livelo_ourocap';
    public const STATUS_DEAL_COMPLETED = 'deal_completed';

    public const AGREEMENT_METRIC_STATUSES = [
        self::STATUS_AWAITING_DRAFT,
        self::STATUS_CLOSED_DEAL,
        self::STATUS_CLOSED_IN_HEARING,
        self::STATUS_PENDING_PAYMENT,
        self::STATUS_PENDING_OBF,
        self::STATUS_PENDING_LIVELO_OUROCAP,
        self::STATUS_DEAL_COMPLETED,
    ];

    public const STATUSES = [
        self::STATUS_INITIAL_ANALYSIS,
        self::STATUS_INDICATIONS,
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
        'indicator_user_id',
        'indicated_at',
        'opposing_party', // Mantemos string para compatibilidade ou texto livre
        'plaintiff_id',   // NOVO: ID do Autor
        'defendant',      // Mantemos string
        'defendant_id',   // NOVO: ID do Réu
        'action_object',
        'action_object_id',
        'description',
        'status',
        'status_started_at',
        'contra_indication_reason',
        'contra_indication_reason_id',
        'contra_indicated_at',
        'contra_indicated_by_user_id',
        'failed_deal_reason',
        'failed_deal_reason_id',
        'failed_deal_at',
        'failed_deal_by_user_id',
        'reanalysis_reason',
        'reanalysis_reason_id',
        'reanalysis_requested_at',
        'reanalysis_requested_by_user_id',
        'priority',
        'original_value',
        'has_alcada',
        'agreement_value',
        'agreement_closed_at',
        'ourocap_value',
        'livelo_points',
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
        'start_date',
        'hearing_date',
        'formalized_by_name',
        'has_obligation',
        'obligation_description',
        'formalized_by_user_id',
        'formalized_at'
    ];

    protected $casts = [
        'tags' => 'array',
        'agreement_checklist_data' => 'array',
        'has_alcada' => 'boolean',
        'livelo_points' => 'integer',
        'agreement_closed_at' => 'date',
        'status_started_at' => 'datetime',
        'contra_indicated_at' => 'datetime',
        'indicated_at' => 'datetime',
        'reanalysis_requested_at' => 'datetime',
        'hearing_date' => 'date',
        'has_obligation' => 'boolean',
        'formalized_at' => 'datetime',
    ];

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

    public function indicator()
    {
        return $this->belongsTo(User::class, 'indicator_user_id');
    }

    public function contraIndicatedBy()
    {
        return $this->belongsTo(User::class, 'contra_indicated_by_user_id');
    }

    public function reanalysisReasonRef()
    {
        return $this->belongsTo(ReanalysisReason::class, 'reanalysis_reason_id');
    }

    public function reanalysisRequestedBy()
    {
        return $this->belongsTo(User::class, 'reanalysis_requested_by_user_id');
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

    public function contraIndicationReasonRef()
    {
        return $this->belongsTo(ContraIndicationReason::class, 'contra_indication_reason_id');
    }

    public function failedDealReasonRef()
    {
        return $this->belongsTo(FailedDealReason::class, 'failed_deal_reason_id');
    }

    public function failedDealBy()
    {
        return $this->belongsTo(User::class, 'failed_deal_by_user_id');
    }
}
