<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class LegalCase extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $table = 'legal_cases';

    protected static function booted(): void
    {
        static::saving(function (self $legalCase) {
            $legalCase->has_alcada = $legalCase->resolveHasAlcadaFromOriginalValue();

            if ($legalCase->isDirty('procedural_phase') && !$legalCase->isDirty('procedural_phase_updated_at')) {
                $legalCase->procedural_phase_updated_at = $legalCase->procedural_phase ? now() : null;
            }

            $legalCase->trackContraIndicationRecurrence();

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

    // Etapas em que o caso já está sendo trabalhado: a mudança de status em lote não tira o caso
    // delas para o início da fila (só a edição individual).
    public const NEGOTIATION_STATUSES = [
        self::STATUS_PROPOSAL_SENT,
        self::STATUS_IN_NEGOTIATION,
    ];

    public const QUEUE_STATUSES = [
        self::STATUS_INITIAL_ANALYSIS,
        self::STATUS_INDICATIONS,
        self::STATUS_CONTRA_INDICATED,
    ];

    /**
     * Mudança em lote que desfaria trabalho avançado: tirar um acordo das etapas de acordo,
     * ou devolver um caso em negociação para a fila de análise.
     */
    public static function isBlockedBatchStatusChange(?string $fromStatus, ?string $toStatus): bool
    {
        if ($fromStatus === null || $toStatus === null || $fromStatus === $toStatus) {
            return false;
        }

        if (in_array($fromStatus, self::AGREEMENT_METRIC_STATUSES, true)) {
            return !in_array($toStatus, self::AGREEMENT_METRIC_STATUSES, true);
        }

        return in_array($fromStatus, self::NEGOTIATION_STATUSES, true)
            && in_array($toStatus, self::QUEUE_STATUSES, true);
    }

    public static function resolveContraIndicationReasonText(?string $reasonText, mixed $reasonId): ?string
    {
        $reasonText = trim((string) $reasonText);
        if ($reasonText !== '') {
            return $reasonText;
        }

        return $reasonId ? ContraIndicationReason::whereKey($reasonId)->value('name') : null;
    }

    /**
     * Conta cada nova contraindicação e guarda a última (motivo, data e autor), que continuam
     * disponíveis depois que o caso volta para a fila e os campos contra_indication_* são limpos.
     */
    private function trackContraIndicationRecurrence(): void
    {
        if ($this->status !== self::STATUS_CONTRA_INDICATED) {
            return;
        }

        $becameContraIndicated = !$this->exists
            || ($this->isDirty('status') && $this->getOriginal('status') !== self::STATUS_CONTRA_INDICATED);
        $reasonChanged = $this->isDirty(['contra_indication_reason', 'contra_indication_reason_id']);

        if (!$becameContraIndicated && !$reasonChanged) {
            return;
        }

        if ($becameContraIndicated) {
            $this->contra_indication_count = (int) $this->contra_indication_count + 1;
        }

        $this->last_contra_indication_reason = self::resolveContraIndicationReasonText(
            $this->contra_indication_reason,
            $this->contra_indication_reason_id
        );
        $this->last_contra_indication_reason_id = $this->contra_indication_reason_id;
        $this->last_contra_indicated_at = $this->contra_indicated_at ?: now();
        $this->last_contra_indicated_by_name = User::whereKey($this->contra_indicated_by_user_id ?: auth()->id())->value('name');
    }

    // Fases processuais da planilha semanal do banco (coluna TX_EST_PRC)
    public const PROCEDURAL_PHASES = ['Inicial', 'Sentença', 'Recurso', 'Cumprimento'];

    /**
     * Normaliza a fase vinda de planilha ou formulário para um dos valores de PROCEDURAL_PHASES
     * (ignora caixa e acentos). Retorna null para vazio ou valor desconhecido.
     */
    public static function normalizeProceduralPhase(mixed $value): ?string
    {
        if ($value === null || !is_scalar($value)) {
            return null;
        }

        $comparable = mb_strtolower(trim((string) $value));
        if ($comparable === '') {
            return null;
        }

        $comparable = strtr($comparable, ['ç' => 'c', 'ã' => 'a', 'á' => 'a', 'â' => 'a', 'é' => 'e', 'ê' => 'e', 'í' => 'i', 'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ú' => 'u']);

        foreach (self::PROCEDURAL_PHASES as $phase) {
            $phaseComparable = strtr(mb_strtolower($phase), ['ç' => 'c', 'ê' => 'e']);
            if ($comparable === $phaseComparable) {
                return $phase;
            }
        }

        return null;
    }

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
        'agreement_fraud_insurance',
        'legal_opinion_portal_confirmed',
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
        'formalized_at',
        'import_batch_id',
        'procedural_phase',
        'procedural_phase_updated_at',
        'contra_indication_count',
        'last_contra_indication_reason',
        'last_contra_indication_reason_id',
        'last_contra_indicated_at',
        'last_contra_indicated_by_name',
    ];

    protected $casts = [
        'tags' => 'array',
        'agreement_checklist_data' => 'array',
        'has_alcada' => 'boolean',
        'agreement_fraud_insurance' => 'boolean',
        'legal_opinion_portal_confirmed' => 'boolean',
        'livelo_points' => 'integer',
        'agreement_closed_at' => 'date',
        'status_started_at' => 'datetime',
        'contra_indicated_at' => 'datetime',
        'indicated_at' => 'datetime',
        'reanalysis_requested_at' => 'datetime',
        'hearing_date' => 'date',
        'has_obligation' => 'boolean',
        'formalized_at' => 'datetime',
        'procedural_phase_updated_at' => 'datetime',
        'contra_indication_count' => 'integer',
        'last_contra_indicated_at' => 'datetime',
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

    public function attachments(): HasMany
    {
        return $this->hasMany(CaseAttachment::class);
    }

    public function legalOpinionAttachment()
    {
        return $this->hasOne(CaseAttachment::class)
            ->select(['id', 'legal_case_id', 'type', 'filename', 'mime_type', 'size', 'uploaded_by_user_id', 'created_at'])
            ->where('type', CaseAttachment::TYPE_LEGAL_OPINION)
            ->latest('id');
    }
}
