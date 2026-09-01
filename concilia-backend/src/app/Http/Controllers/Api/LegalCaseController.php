<?php

namespace App\Http\Controllers\Api;

use App\Services\AuditService;
use App\Http\Controllers\Controller;
use App\Models\CaseAttachment;
use App\Models\CaseTag;
use App\Models\LegalCase;
use App\Models\User;
use App\Models\AuditLog;
use App\Models\Client;
use App\Models\Plaintiff;       
use App\Models\Defendant;       
use App\Models\OpposingLawyer;  
use App\Models\ActionObject;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log; 
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class LegalCaseController extends Controller
{
    use AuthorizesRequests;

    private const MULTI_CASE_NUMBER_MIN_DIGITS = 15;
    private const UNASSIGNED_RESPONSIBLE_VALUE = '__unassigned__';

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', LegalCase::class);

        try {
            AuditService::log('view_pipeline', 'O usuário acessou o pipeline de acordos.');
        } catch (\Exception $e) {}
        
        $user = Auth::user();
        $indicatorFilterRequested = $request->filled('indicator_user_id');

        if ($indicatorFilterRequested && !$this->legalCasesTableHasIndicatorUserId()) {
            return response()->json(['message' => 'Filtro por indicador indisponível.'], 422);
        }
        
        // Começa a query base, carregando todos os relacionamentos importantes
        $query = LegalCase::whereNull('archived_at')
            ->with($this->caseRelationshipLoads());

        // --- FILTRO POR SCOPE (ALÇADA) ---
        $scope = $request->input('scope', 'pipeline');
        if ($scope === 'pipeline') {
            $query->where('has_alcada', true);
        } elseif ($scope === 'general_base') {
            if (!in_array($user->role, ['administrador', 'supervisor'])) {
                return response()->json(['message' => 'Acesso negado.'], 403);
            }
            $query->where('has_alcada', false);
        }
        // scope=all → sem filtro de alçada

        if ($user->role === 'indicador') {
            if ($indicatorFilterRequested) {
                $query->where('indicator_user_id', $request->input('indicator_user_id'));
            }
        } elseif ($indicatorFilterRequested) {
            $query->where('indicator_user_id', $request->input('indicator_user_id'));
        }

        // --- LÓGICA DE PERMISSÃO (RBAC) ---
        $this->applyResponsibleFilter($query, $request, $user);

        // Filtro de busca por termo
        if ($request->filled('search')) {
            $this->applySearchFilter($query, (string) $request->input('search'));
        }

        // Filtro por Status (suporta singular e array)
        if ($request->has('statuses')) {
            $statusValues = array_filter(Arr::wrap($request->input('statuses')));
            if (!empty($statusValues)) {
                $query->whereIn('status', $statusValues);
            }
        } elseif ($request->has('status') && $request->input('status') != '') {
            $query->where('status', $request->input('status'));
        }

        // Filtro por Prioridade
        if ($request->has('priority') && $request->input('priority') != '') {
            $query->where('priority', $request->input('priority'));
        }

        if ($request->filled('action_object')) {
            $actionObjectSearch = trim((string) $request->input('action_object'));

            if ($actionObjectSearch !== '') {
                $query->where(function ($actionObjectQuery) use ($actionObjectSearch) {
                    $actionObjectQuery
                        ->where('action_object', 'like', "%{$actionObjectSearch}%")
                        ->orWhereHas('actionObject', function ($relatedActionObjectQuery) use ($actionObjectSearch) {
                            $relatedActionObjectQuery->where('name', 'like', "%{$actionObjectSearch}%");
                        });
                });
            }
        }

        // Filtro por Tags (suporta singular e array)
        $tagValues = $request->has('tags') ? array_filter(Arr::wrap($request->input('tags'))) : [];
        if (empty($tagValues) && $request->filled('tag')) {
            $tagValues = [$request->input('tag')];
        }
        foreach ($tagValues as $tagValue) {
            $normalizedTag = CaseTag::normalizeTag($tagValue);
            if ($normalizedTag !== null) {
                $tagName = $normalizedTag['text'];
                $query->where(function ($tagQuery) use ($tagName) {
                    $tagQuery
                        ->whereJsonContains('tags', $tagName)
                        ->orWhereRaw("JSON_SEARCH(tags, 'one', ?, NULL, '$[*].text') IS NOT NULL", [$tagName]);
                });
            }
        }

        // Filtro por Indicador (suporta singular e array)
        if (!$indicatorFilterRequested && $request->has('indicator_user_ids')) {
            $indicatorIds = array_filter(Arr::wrap($request->input('indicator_user_ids')), fn ($v) => $v !== '' && $v !== null);
            if (!empty($indicatorIds) && $this->legalCasesTableHasIndicatorUserId()) {
                $query->whereIn('indicator_user_id', $indicatorIds);
            }
        }

        // Filtro por Data
        $dateColumn = in_array($request->input('date_field'), ['agreement_closed_at', 'indicated_at', 'created_at'], true)
            ? $request->input('date_field')
            : 'created_at';
        if ($request->filled('date_from')) {
            $query->where($dateColumn, '>=', $request->input('date_from') . ' 00:00:00');
        }
        if ($request->filled('date_to')) {
            $query->where($dateColumn, '<=', $request->input('date_to') . ' 23:59:59');
        }

        // --- ORDENAÇÃO DINÂMICA ---
        $sortColumn = $request->input('sort_by', 'id'); // Padrão: ID
        $sortDirection = $request->input('sort_order', 'desc'); // Padrão: Decrescente

        // Lista branca de colunas permitidas (Segurança)
        $allowedSorts = ['id', 'case_number', 'cause_value', 'agreement_value', 'status', 'priority', 'created_at', 'updated_at'];
        
        if (!in_array($sortColumn, $allowedSorts)) {
            $sortColumn = 'id';
        }
        if (!in_array(strtolower($sortDirection), ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }

        $query->orderBy($sortColumn, $sortDirection);

        // --- PAGINAÇÃO ---
        $perPage = (int) $request->input('per_page', 50);
        if ($perPage > 200) $perPage = 200;
        if ($perPage < 1) $perPage = 50;

        $paginatedCases = $query->paginate($perPage);
        $response = $paginatedCases->toArray();
        $response['search_feedback'] = $this->buildSearchFeedback($request, $user, (int) ($response['total'] ?? 0));

        return response()->json($response);
    }

    /**
     * Gera a minuta de acordo em PDF.
     */
    public function generateAgreement($id)
    {
        $case = LegalCase::with(['client', 'plaintiff', 'defendantRel', 'opposingLawyer'])->findOrFail($id);

        // Prioriza os campos estruturados do caso e mantém o fallback legado para registros antigos.
        $isOurocap = $this->hasFilledValue($case->ourocap_value);
        $isLivelo = $this->hasFilledValue($case->livelo_points);

        if (!$isOurocap && !$isLivelo) {
            if (str_contains(mb_strtolower($case->description ?? ''), 'ourocap')) {
                $isOurocap = true;
            }

            if ($case->client && str_contains(mb_strtolower($case->client->name), 'livelo')) {
                $isLivelo = true;
            }
        }

        // 3. Detectar se tem OBRIGAÇÃO DE FAZER
        $hasObligation = !empty($case->obligation_description); 

        // --- SELEÇÃO DO ARQUIVO BLADE CORRETO ---
        if ($isOurocap) {
            $viewName = 'documents.minuta_ourocap';
        } elseif ($isLivelo) {
            $viewName = 'documents.minuta_livelo';
        } elseif ($hasObligation) {
            $viewName = 'documents.minuta_com_obrigacao';
        } else {
            $viewName = 'documents.minuta_padrao_sem_obrigacao'; 
        }

        // Gera o PDF
        $pdf = Pdf::loadView($viewName, ['case' => $case]);

        // Baixa o arquivo
        return $pdf->download('minuta_acordo_' . $case->case_number . '.pdf');
    }

    /**
     * Criação unitária de caso.
     */
    public function store(Request $request): JsonResponse
    {
        if (Auth::user()?->role === 'indicador') {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        // Conversão de lawyer_id para user_id (Lógica Original Mantida)
        if ($request->has('lawyer_id')) {
            $request->merge(['user_id' => $request->input('lawyer_id')]);
        }

        $request->merge($this->resolveActionObjectPayload($request->all()));
        $request->merge($this->normalizeSettlementBenefitPayload($request->all()));
        $request->merge($this->resolveAgreementClosedAtPayload($request->all()));
        $request->merge(['tags' => CaseTag::normalizeCollection($request->input('tags', []))]);

        $validatedData = $request->validate([
            'case_number' => 'required|string|max:255',
            'start_date' => 'nullable|date',
            'client_id' => 'required|exists:clients,id',
            'user_id' => ['required', 'integer', $this->activeOperatorUserExistsRule()],
            
            // Dados legados (Texto)
            'opposing_party' => 'required|string|max:255',
            'defendant' => 'required|string|max:255',

            // NOVOS IDs (Relacionamentos)
            'plaintiff_id' => 'nullable|exists:plaintiffs,id',
            'defendant_id' => 'nullable|exists:defendants,id',
            'opposing_lawyer_id' => 'nullable|exists:opposing_lawyers,id',

            'action_object' => 'required|string|max:255',
            'action_object_id' => 'nullable|exists:action_objects,id',
            'description' => 'nullable|string',
            'status' => 'required|string',
            'contra_indication_reason' => 'nullable|string|max:4000',
            'contra_indication_reason_id' => 'nullable|exists:contra_indication_reasons,id',
            'failed_deal_reason' => 'nullable|string|max:4000',
            'failed_deal_reason_id' => 'nullable|exists:failed_deal_reasons,id',
            'priority' => 'required|string',
            'original_value' => 'required|numeric',
            'agreement_value' => 'nullable|numeric',
            'agreement_closed_at' => 'nullable|date',
            'ourocap_value' => $this->ourocapValidationRules($request),
            'livelo_points' => $this->liveloPointsValidationRules($request),
            'cause_value' => 'nullable|numeric',
            
            'opposing_lawyer' => 'nullable|string', // Nome visual
            'opposing_contact' => 'nullable|string',
            
            'comarca' => 'nullable|string',
            'state' => 'nullable|string',
            'city' => 'nullable|string',
            'special_court' => 'nullable|string',
            
            'tags' => 'nullable|array',
            'tags.*.text' => 'required|string|max:100',
            'tags.*.color' => 'nullable|string|max:20',
            'agreement_probability' => 'nullable|numeric|min:0|max:100',
            'pcond_probability' => 'nullable|numeric|min:0',
            'updated_condemnation_value' => 'nullable|numeric',
            'agreement_checklist_data' => 'nullable|array',
        ]);

        $validatedData = $this->applyContraIndicationPayload($validatedData);
        $validatedData = $this->applyFailedDealPayload($validatedData);

        $case = LegalCase::create($validatedData);
        $this->syncCaseTagCatalog($validatedData['tags'] ?? []);

        // --- NOVO: LOG DE AUDITORIA (BLINDADO) ---
        try {
            AuditLog::create([
                'user_id' => auth()->id(),
                'user_name' => auth()->user() ? auth()->user()->name : 'Sistema',
                'action' => 'Criação de Caso',
                'details' => "Criou o caso nº {$case->case_number} em '{$case->status}'",
                'ip_address' => $request->ip(),
            ]);
        } catch (\Exception $e) {
            Log::error("Erro AuditLog store case: " . $e->getMessage());
        }
        // -----------------------------------------

        return response()->json($case, 201);
    }

    /**
     * Exibe detalhes do caso.
     */
    public function show(LegalCase $case): JsonResponse
    {
        $this->authorize('view', $case);

        // Carrega todos os relacionamentos para exibição completa
        return response()->json($case->load($this->caseRelationshipLoads([
            'histories',
            'histories.user',
        ])));
    }

    /**
     * Atualiza um caso existente.
     */
    public function update(Request $request, LegalCase $case): JsonResponse
    {
        $this->authorize('update', $case);

        if (Auth::user()?->role === 'indicador') {
            return response()->json(['message' => 'Indicadores devem usar o fluxo de indicação do caso.'], 403);
        }

        // Compatibilidade com frontend antigo
        if ($request->has('lawyer_id')) {
            $request->merge(['user_id' => $request->input('lawyer_id')]);
        }

        $request->merge($this->resolveActionObjectPayload($request->all()));
        $request->merge($this->normalizeSettlementBenefitPayload($request->all()));
        $request->merge($this->resolveAgreementClosedAtPayload($request->all(), $case));

        if (array_key_exists('tags', $request->all())) {
            $request->merge(['tags' => CaseTag::normalizeCollection($request->input('tags', []))]);
        }

        // Salva o status ANTIGO para o log de auditoria
        $oldStatus = $case->status;

        $validatedData = $request->validate([
            'case_number' => 'sometimes|required|string|max:255',
            'start_date' => 'nullable|date',
            'client_id' => 'sometimes|required|exists:clients,id',
            'user_id' => ['sometimes', 'nullable', 'integer', $this->activeOperatorUserExistsRule()],
            
            'opposing_party' => 'sometimes|required|string|max:255',
            'defendant' => 'sometimes|required|string|max:255',
            
            // Validação dos novos campos
            'plaintiff_id' => 'nullable|exists:plaintiffs,id',
            'defendant_id' => 'nullable|exists:defendants,id',
            'opposing_lawyer_id' => 'nullable|exists:opposing_lawyers,id',

            'action_object' => 'sometimes|required|string|max:255',
            'action_object_id' => 'nullable|exists:action_objects,id',
            'description' => 'nullable|string',
            'status' => 'sometimes|required|string',
            'contra_indication_reason' => 'nullable|string|max:4000',
            'contra_indication_reason_id' => 'nullable|exists:contra_indication_reasons,id',
            'failed_deal_reason' => 'nullable|string|max:4000',
            'failed_deal_reason_id' => 'nullable|exists:failed_deal_reasons,id',
            'priority' => 'sometimes|required|string',
            'original_value' => 'sometimes|required|numeric',
            'agreement_value' => 'nullable|numeric',
            'agreement_closed_at' => 'nullable|date',
            'agreement_fraud_insurance' => 'nullable|boolean',
            'ourocap_value' => $this->ourocapValidationRules($request, $case),
            'livelo_points' => $this->liveloPointsValidationRules($request, $case),
            'cause_value' => 'nullable|numeric',
            
            'comarca' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:2',
            'city' => 'nullable|string|max:255',
            'special_court' => 'nullable|string',
            
            'opposing_lawyer' => 'nullable|string|max:255',
            'opposing_contact' => 'nullable|string|max:255',
            
            'tags' => 'nullable|array',
            'tags.*.text' => 'required|string|max:100',
            'tags.*.color' => 'nullable|string|max:20',
            'agreement_probability' => 'nullable|numeric|min:0|max:100',
            'pcond_probability' => 'nullable|numeric|min:0',
            'updated_condemnation_value' => 'nullable|numeric',
            'agreement_checklist_data' => 'nullable|array',
        ]);

        $validatedData = $this->applyContraIndicationPayload($validatedData, $case);
        $validatedData = $this->applyFailedDealPayload($validatedData, $case);

        $resultingStatus = $validatedData['status'] ?? $case->status;
        if ($resultingStatus === 'closed_deal' || $resultingStatus === 'closed_in_hearing') {
            $agreementValue = $validatedData['agreement_value'] ?? $case->agreement_value;
            $agreementClosedAt = $validatedData['agreement_closed_at'] ?? $case->agreement_closed_at;

            if (!$agreementValue || $agreementValue <= 0) {
                return response()->json([
                    'message' => 'Informe o valor do acordo para fechar o caso.',
                    'errors'  => ['agreement_value' => ['O valor do acordo é obrigatório.']],
                ], 422);
            }
            if (!$agreementClosedAt) {
                return response()->json([
                    'message' => 'Informe a data do acordo para fechar o caso.',
                    'errors'  => ['agreement_closed_at' => ['A data do acordo é obrigatória.']],
                ], 422);
            }

            $isEnteringClosing = !in_array($case->status, ['closed_deal', 'closed_in_hearing'], true);
            if ($isEnteringClosing) {
                $fraudAnswer = array_key_exists('agreement_fraud_insurance', $validatedData)
                    ? $validatedData['agreement_fraud_insurance']
                    : $case->agreement_fraud_insurance;

                if ($fraudAnswer === null) {
                    return response()->json([
                        'message' => 'Informe se o acordo envolve matéria de golpe ou seguro prestamista.',
                        'errors'  => ['agreement_fraud_insurance' => ['Responda se o acordo envolve matéria de golpe ou seguro prestamista.']],
                    ], 422);
                }

                if ($fraudAnswer) {
                    $hasLegalOpinion = CaseAttachment::query()
                        ->where('legal_case_id', $case->id)
                        ->where('type', CaseAttachment::TYPE_LEGAL_OPINION)
                        ->exists();

                    if (!$hasLegalOpinion) {
                        return response()->json([
                            'message' => 'Anexe o parecer jurídico do caso (matéria de golpe/seguro prestamista) para fechar o acordo.',
                            'errors'  => ['legal_opinion' => ['O parecer jurídico é obrigatório para acordos de golpe ou seguro prestamista.']],
                        ], 422);
                    }
                }
            }
        }

        $originalData = $case->getOriginal();
        $case->update($validatedData);
        if (array_key_exists('tags', $validatedData)) {
            $this->syncCaseTagCatalog($validatedData['tags'] ?? []);
        }
        $changes = $case->getChanges();

        if (isset($changes['user_id'])) {
            $checklist = $case->agreement_checklist_data;
            if (is_array($checklist) && isset($checklist['indication_checklist']['assigned_operator'])) {
                $newOperator = User::find($changes['user_id']);
                if ($newOperator) {
                    $checklist['indication_checklist']['assigned_operator'] = [
                        'id' => $newOperator->id,
                        'name' => $newOperator->name,
                    ];
                    $case->updateQuietly(['agreement_checklist_data' => $checklist]);
                }
            }
        }

        // --- SISTEMA DE HISTÓRICO INTERNO DO CASO (Lógica Original Mantida) ---
        if (!empty($changes)) {
            unset($changes['updated_at']);
            unset($changes['status_started_at']);
            if (!empty($changes)) {
                $oldValues = Arr::only($originalData, array_keys($changes));
                $newValues = $changes;
                $case->histories()->create([
                    'user_id' => Auth::id(),
                    'event_type' => 'update',
                    'description' => 'O caso foi atualizado.',
                    'old_values' => $oldValues,
                    'new_values' => $newValues,
                ]);
            }
        }

        // --- NOVO: LOG DE AUDITORIA GERAL (KANBAN) ---
        // Verifica se houve mudança especificamente no status
        if (isset($validatedData['status']) && $oldStatus !== $case->status) {
            try {
                AuditLog::create([
                    'user_id' => auth()->id(),
                    'user_name' => auth()->user() ? auth()->user()->name : 'Sistema',
                    'action' => 'Movimentação de Caso',
                    'details' => "Moveu o caso #{$case->case_number} de '{$oldStatus}' para '{$case->status}'",
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Exception $e) {
                Log::error("Erro AuditLog update status: " . $e->getMessage());
            }
        } 
        else {
             // Log de edição genérica (sem mudança de status)
             try {
                AuditLog::create([
                    'user_id' => auth()->id(),
                    'user_name' => auth()->user() ? auth()->user()->name : 'Sistema',
                    'action' => 'Edição de Caso',
                    'details' => "Editou detalhes do caso #{$case->case_number}",
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Exception $e) {}
        }
        // ----------------------------------------------------

        return response()->json($case->fresh($this->caseRelationshipLoads()));
    }

    public function indicate(Request $request, LegalCase $case): JsonResponse
    {
        $user = Auth::user();

        if (!in_array($user?->role, ['indicador', 'administrador', 'supervisor'], true)) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        if ($case->status !== LegalCase::STATUS_INITIAL_ANALYSIS) {
            return response()->json(['message' => 'Somente casos em Análise Inicial podem ser indicados para acordo.'], 422);
        }

        $case->loadMissing('opposingLawyer');

        $validatedData = $request->validate([
            'responsible_user_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where(function ($query) {
                    $query
                        ->where('role', 'operador')
                        ->where('status', 'ativo');
                }),
            ],
            'materia.is_valid_for_agreement' => 'required|boolean',
            'materia.notes' => 'nullable|string|max:2000',
            'obrigacao.type' => 'required|string|in:simples,complexa,apenas_pecuniaria',
            'subsidio.available' => 'required|string|in:sim,nao',
            'analise_subsidio.notes' => 'required|string|max:4000',
            'litigante_habitual.notes' => 'nullable|string|max:2000',
            'analise_risco.last_analysis_date' => 'required|date',
            'pcond_portal.value' => 'required|string|max:2000',
            'pcond_processual.value' => 'required|string|max:4000',
        ]);

        $hasLitigantRestriction = (bool) ($case->opposingLawyer?->is_abusive ?? false);
        $blockingReasons = [];

        if (($validatedData['materia']['is_valid_for_agreement'] ?? false) !== true) {
            $blockingReasons[] = 'a materia esta contraindicada';
        }

        if (($validatedData['subsidio']['available'] ?? null) !== 'sim') {
            $blockingReasons[] = 'nao ha subsidio disponibilizado';
        }

        if ($hasLitigantRestriction) {
            $blockingReasons[] = 'o advogado adverso esta marcado como litigante abusivo';
        }

        if ($blockingReasons !== []) {
            return response()->json([
                'message' => 'O caso nao pode ser indicado para acordo porque ' . $this->formatBlockingReasons($blockingReasons) . '.',
                'blocking_reasons' => $blockingReasons,
            ], 422);
        }

        $existingChecklistData = is_array($case->agreement_checklist_data)
            ? $case->agreement_checklist_data
            : [];
        $responsibleOperator = User::query()
            ->where('id', $validatedData['responsible_user_id'])
            ->where('role', 'operador')
            ->where('status', 'ativo')
            ->firstOrFail();
        $formattedAlcadaValue = $this->formatChecklistCurrency($case->original_value);
        $previousResponsibleUserId = $case->user_id;
        $supportsIndicatorUserId = $this->legalCasesTableHasIndicatorUserId();
        $previousIndicatorUserId = $supportsIndicatorUserId ? $case->indicator_user_id : null;

        $existingChecklistData['indication_checklist'] = [
            'version' => 1,
            'completed_at' => now()->toIso8601String(),
            'completed_by' => [
                'id' => $user->id,
                'name' => $user->name,
            ],
            'indicator' => [
                'id' => $user->id,
                'name' => $user->name,
            ],
            'assigned_operator' => [
                'id' => $responsibleOperator->id,
                'name' => $responsibleOperator->name,
            ],
            'fields' => [
                'materia' => [
                    'label' => 'Matéria',
                    'source' => 'Portal BB',
                    'classification' => 'objetivo',
                    'is_valid_for_agreement' => (bool) $validatedData['materia']['is_valid_for_agreement'],
                    'notes' => $validatedData['materia']['notes'] ?? null,
                ],
                'obrigacao' => [
                    'label' => 'Obrigação',
                    'source' => 'Portal BB',
                    'classification' => 'objetivo',
                    'type' => $validatedData['obrigacao']['type'],
                ],
                'subsidio' => [
                    'label' => 'Subsídio',
                    'source' => 'Portal BB',
                    'classification' => 'objetivo',
                    'available' => $validatedData['subsidio']['available'],
                ],
                'analise_subsidio' => [
                    'label' => 'Análise do Subsídio',
                    'source' => 'Portal BB',
                    'classification' => 'subjetivo',
                    'notes' => $validatedData['analise_subsidio']['notes'],
                ],
                'litigante_habitual' => [
                    'label' => 'Litigante Habitual',
                    'source' => 'Portal BB ou L1',
                    'classification' => 'objetivo',
                    'has_restriction' => $hasLitigantRestriction,
                    'notes' => $validatedData['litigante_habitual']['notes'] ?? null,
                ],
                'analise_risco' => [
                    'label' => 'Análise de Risco',
                    'source' => 'Portal BB',
                    'classification' => 'objetivo',
                    'last_analysis_date' => $validatedData['analise_risco']['last_analysis_date'],
                ],
                'pcond_portal' => [
                    'label' => 'PCOND Portal',
                    'source' => 'Portal BB',
                    'classification' => 'objetivo',
                    'value' => $validatedData['pcond_portal']['value'],
                ],
                'pcond_processual' => [
                    'label' => 'PCOND Processual',
                    'source' => 'Processo',
                    'classification' => 'subjetivo',
                    'value' => $validatedData['pcond_processual']['value'],
                ],
                'alcada' => [
                    'label' => 'Alçada',
                    'source' => 'Portal BB',
                    'classification' => 'objetivo',
                    'value' => $case->original_value,
                    'formatted_value' => $formattedAlcadaValue,
                ],
            ],
        ];

        $caseUpdatePayload = [
            'status' => LegalCase::STATUS_INDICATIONS,
            'user_id' => $responsibleOperator->id,
            'agreement_checklist_data' => $existingChecklistData,
        ];

        if ($supportsIndicatorUserId && !$case->indicator_user_id) {
            $caseUpdatePayload['indicator_user_id'] = $user->id;
            $caseUpdatePayload['indicated_at'] = now();
        }

        $effectiveIndicatorId = $case->indicator_user_id ?: $user->id;

        $case->update($caseUpdatePayload);

        $case->histories()->create([
            'user_id' => Auth::id(),
            'event_type' => 'update',
            'description' => 'O caso foi indicado para acordo com checklist obrigatório preenchido.',
            'old_values' => [
                'status' => LegalCase::STATUS_INITIAL_ANALYSIS,
                'user_id' => $previousResponsibleUserId,
                'indicator_user_id' => $previousIndicatorUserId,
            ],
            'new_values' => [
                'status' => LegalCase::STATUS_INDICATIONS,
                'user_id' => $responsibleOperator->id,
                'indicator_user_id' => $effectiveIndicatorId,
            ],
        ]);

        try {
            AuditLog::create([
                'user_id' => auth()->id(),
                'user_name' => auth()->user() ? auth()->user()->name : 'Sistema',
                'action' => 'Indicação de Caso',
                'details' => "Indicou o caso #{$case->case_number} para acordo e atribuiu ao operador {$responsibleOperator->name}",
                'ip_address' => $request->ip(),
            ]);
        } catch (\Exception $e) {
            Log::error("Erro AuditLog indication: " . $e->getMessage());
        }

        return response()->json($case->fresh($this->caseRelationshipLoads()));
    }


    public function formalizeAgreement(Request $request, LegalCase $case): JsonResponse
    {
        $user = Auth::user();

        if (!in_array($user?->role, ['indicador', 'administrador', 'supervisor'], true)) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $validatedData = $request->validate([
            'formalized_by_name'  => 'required|string|max:255',
            'formalized_by_indicator_id' => 'nullable|integer|exists:users,id',
            'hearing_date'        => 'required|date',
            'agreement_value'     => 'required|numeric|min:0',
            'has_obligation'      => 'required|boolean',
            'obligation_description' => 'nullable|required_if:has_obligation,true|string|max:4000',
        ]);

        $oldStatus = $case->status;

        $formalizePayload = [
            'status'                  => LegalCase::STATUS_CLOSED_IN_HEARING,
            'formalized_by_name'      => $validatedData['formalized_by_name'],
            'hearing_date'            => $validatedData['hearing_date'],
            'agreement_value'         => $validatedData['agreement_value'],
            'agreement_closed_at'     => $validatedData['hearing_date'],
            'has_obligation'          => $validatedData['has_obligation'],
            'obligation_description'  => $validatedData['obligation_description'] ?? null,
            'formalized_by_user_id'   => $user->id,
            'formalized_at'           => now(),
        ];

        if (!$case->indicator_user_id) {
            $formalizePayload['indicator_user_id'] = $validatedData['formalized_by_indicator_id'] ?? $user->id;
            $formalizePayload['indicated_at'] = now();
        }

        $case->update($formalizePayload);

        $case->histories()->create([
            'user_id'     => Auth::id(),
            'event_type'  => 'update',
            'description' => 'Acordo formalizado pelo indicador apos audiencia.',
            'old_values'  => ['status' => $oldStatus],
            'new_values'  => [
                'status'             => LegalCase::STATUS_CLOSED_IN_HEARING,
                'formalized_by_name' => $validatedData['formalized_by_name'],
                'hearing_date'       => $validatedData['hearing_date'],
                'agreement_value'    => $validatedData['agreement_value'],
                'has_obligation'     => $validatedData['has_obligation'],
            ],
        ]);

        try {
            AuditLog::create([
                'user_id'    => auth()->id(),
                'user_name'  => auth()->user() ? auth()->user()->name : 'Sistema',
                'action'     => 'Formalizacao de Acordo',
                'details'    => "Formalizou acordo do caso #{$case->case_number} - Valor: R$ " . number_format($validatedData['agreement_value'], 2, ',', '.') . " - Indicador: {$validatedData['formalized_by_name']}",
                'ip_address' => $request->ip(),
            ]);
        } catch (\Exception $e) {
            Log::error("Erro AuditLog formalize: " . $e->getMessage());
        }

        return response()->json($case->fresh($this->caseRelationshipLoads()));
    }

    public function uploadLegalOpinion(Request $request, LegalCase $case): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'file' => 'required|file|max:10240|mimes:pdf,doc,docx,jpg,jpeg,png',
            'portal_confirmed' => 'required|accepted',
        ]);

        $file = $request->file('file');

        CaseAttachment::create([
            'legal_case_id' => $case->id,
            'type' => CaseAttachment::TYPE_LEGAL_OPINION,
            'filename' => mb_substr($file->getClientOriginalName() ?: 'parecer.pdf', 0, 255),
            'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
            'size' => (int) $file->getSize(),
            'content' => file_get_contents($file->getRealPath()),
            'uploaded_by_user_id' => $user?->id,
        ]);

        $case->update([
            'agreement_fraud_insurance' => true,
            'legal_opinion_portal_confirmed' => true,
        ]);

        $case->histories()->create([
            'user_id' => $user?->id,
            'event_type' => 'update',
            'description' => 'Parecer jurídico (golpe/seguro prestamista) anexado. Operador confirmou anexo no portal do banco.',
            'old_values' => [],
            'new_values' => ['legal_opinion_filename' => $file->getClientOriginalName()],
        ]);

        try {
            AuditLog::create([
                'user_id' => $user?->id,
                'user_name' => $user?->name ?: 'Sistema',
                'action' => 'Anexo de Parecer Juridico',
                'details' => "Anexou parecer juridico ao caso #{$case->case_number} ({$file->getClientOriginalName()})",
                'ip_address' => $request->ip(),
            ]);
        } catch (\Exception $e) {
            Log::error('Erro AuditLog parecer: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Parecer anexado com sucesso.',
            'case' => $case->fresh($this->caseRelationshipLoads()),
        ]);
    }

    public function downloadLegalOpinion(LegalCase $case)
    {
        $attachment = CaseAttachment::query()
            ->where('legal_case_id', $case->id)
            ->where('type', CaseAttachment::TYPE_LEGAL_OPINION)
            ->latest('id')
            ->first();

        if (!$attachment) {
            return response()->json(['message' => 'Nenhum parecer anexado a este caso.'], 404);
        }

        return response($attachment->getRawOriginal('content'), 200, [
            'Content-Type' => $attachment->mime_type,
            'Content-Disposition' => 'attachment; filename="' . str_replace('"', '', $attachment->filename) . '"',
            'Content-Length' => (string) $attachment->size,
        ]);
    }

    public function requestReanalysis(Request $request, LegalCase $case): JsonResponse
    {
        $user = Auth::user();

        if (!in_array($user?->role, ['indicador', 'administrador', 'supervisor'], true)) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $allowedStatuses = [
            LegalCase::STATUS_CONTRA_INDICATED,
            LegalCase::STATUS_FAILED_DEAL,
        ];

        if (!in_array($case->status, $allowedStatuses, true)) {
            return response()->json([
                'message' => 'Somente casos Contraindicados ou com Acordo Frustrado podem ser enviados para reanálise.',
            ], 422);
        }

        $validatedData = $request->validate([
            'reanalysis_reason_id' => 'nullable|integer|exists:reanalysis_reasons,id',
            'reanalysis_reason' => 'required|string|max:4000',
        ]);
        $reanalysisReason = trim((string) $validatedData['reanalysis_reason']);

        if ($reanalysisReason === '') {
            throw ValidationException::withMessages([
                'reanalysis_reason' => 'Informe o motivo da reanálise.',
            ]);
        }

        $oldStatus = $case->status;
        $supportsIndicatorUserId = $this->legalCasesTableHasIndicatorUserId();
        $previousIndicatorUserId = $supportsIndicatorUserId ? $case->indicator_user_id : null;
        $previousContraIndicationReason = $case->contra_indication_reason;
        $previousReanalysisReason = $case->reanalysis_reason;
        $requestedAt = now();

        $caseUpdatePayload = [
            'status' => LegalCase::STATUS_INITIAL_ANALYSIS,
            'contra_indication_reason' => null,
            'contra_indication_reason_id' => null,
            'contra_indicated_at' => null,
            'contra_indicated_by_user_id' => null,
            'reanalysis_reason' => $reanalysisReason,
            'reanalysis_reason_id' => $validatedData['reanalysis_reason_id'] ?? null,
            'reanalysis_requested_at' => $requestedAt,
            'reanalysis_requested_by_user_id' => $user->id,
        ];

        if ($supportsIndicatorUserId && !$case->indicator_user_id) {
            $caseUpdatePayload['indicator_user_id'] = $user->id;
            $caseUpdatePayload['indicated_at'] = now();
        }

        $case->update($caseUpdatePayload);

        $case->histories()->create([
            'user_id' => Auth::id(),
            'event_type' => 'update',
            'description' => 'Reanálise solicitada pelo indicador.',
            'old_values' => [
                'status' => $oldStatus,
                'indicator_user_id' => $previousIndicatorUserId,
                'contra_indication_reason' => $previousContraIndicationReason,
                'reanalysis_reason' => $previousReanalysisReason,
            ],
            'new_values' => [
                'status' => LegalCase::STATUS_INITIAL_ANALYSIS,
                'indicator_user_id' => $case->indicator_user_id,
                'contra_indication_reason' => null,
                'reanalysis_reason' => $reanalysisReason,
                'reanalysis_requested_at' => $requestedAt->toIso8601String(),
                'reanalysis_requested_by_user_id' => $user->id,
            ],
        ]);

        try {
            AuditLog::create([
                'user_id' => auth()->id(),
                'user_name' => auth()->user() ? auth()->user()->name : 'Sistema',
                'action' => 'Solicitação de Reanálise',
                'details' => "Solicitou reanálise do caso #{$case->case_number} e vinculou o indicador {$user->name}. Motivo: {$reanalysisReason}",
                'ip_address' => $request->ip(),
            ]);
        } catch (\Exception $e) {
            Log::error("Erro AuditLog request reanalysis: " . $e->getMessage());
        }

        return response()->json($case->fresh($this->caseRelationshipLoads()));
    }

    /**
     * Remove um caso.
     */
    public function destroy(LegalCase $case): JsonResponse
    {
        $this->authorize('delete', $case);
        
        $numeroProcesso = $case->case_number; // Salva o número antes de apagar
        $case->delete();

        // --- NOVO: LOG DE AUDITORIA (EXCLUSÃO) ---
        try {
            AuditLog::create([
                'user_id' => auth()->id(),
                'user_name' => auth()->user() ? auth()->user()->name : 'Sistema',
                'action' => 'Exclusão de Caso',
                'details' => "Excluiu o caso nº {$numeroProcesso}",
                'ip_address' => request()->ip(),
            ]);
        } catch (\Exception $e) {
            Log::error("Erro AuditLog destroy case: " . $e->getMessage());
        }
        // ------------------------------------------

        return response()->json(null, 204);
    }

    /**
     * Exporta dados para CSV.
     */
    public function export(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $fileName = 'casos_concilia_' . date('Y-m-d') . '.csv';

        $user = Auth::user();
        $query = LegalCase::whereNull('archived_at')
            ->with($this->caseRelationshipLoads(['client', 'lawyer']));

        // --- FILTRO POR SCOPE (ALÇADA) ---
        $scope = $request->input('scope', 'pipeline');
        if ($scope === 'pipeline') {
            $query->where('has_alcada', true);
        } elseif ($scope === 'general_base') {
            $query->where('has_alcada', false);
        }

        // --- LÓGICA DE PERMISSÃO (Mantida) ---
        $this->applyResponsibleFilter($query, $request, $user);

        if ($request->filled('search')) {
            $this->applySearchFilter($query, (string) $request->input('search'));
        }
        if ($request->has('statuses')) {
            $statusValues = array_filter(Arr::wrap($request->input('statuses')));
            if (!empty($statusValues)) {
                $query->whereIn('status', $statusValues);
            }
        } elseif ($request->has('status') && $request->input('status') != '') {
            $query->where('status', $request->input('status'));
        }
        if ($request->has('priority') && $request->input('priority') != '') {
            $query->where('priority', $request->input('priority'));
        }

        $cases = $query->get();
        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$fileName",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];
        $columns = ['ID', 'Numero Processo', 'Cliente', 'Autor', 'Reu', 'Status', 'Prioridade', 'Advogado Responsavel', 'Valor Causa', 'Valor Acordo', 'Valor Alçada'];

        $callback = function () use ($cases, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);
            foreach ($cases as $case) {
                $row['ID'] = $case->id;
                $row['Numero Processo'] = $case->case_number;
                $row['Cliente'] = $case->client->name ?? 'N/A';
                $row['Autor'] = $case->opposing_party;
                $row['Reu'] = $case->defendant;
                $row['Status'] = $case->status;
                $row['Prioridade'] = $case->priority;
                $row['Advogado Responsavel'] = $case->lawyer?->name ?? 'N/A';
                $row['Valor Causa'] = $case->cause_value;
                $row['Valor Acordo'] = $case->agreement_value;
                $row['Valor Alçada'] = $case->original_value;
                fputcsv($file, array_values($row));
            }
            fclose($file);
        };
        return response()->stream($callback, 200, $headers);
    }

    /**
     * Importação em massa BLINDADA e com FORMATAÇÃO CNJ.
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'cases' => 'required|array|min:1',
        ]);

        $casesToImport = $validatedData['cases'];
        $clientId = $validatedData['client_id'];
        $clientName = $this->getImportClientName($clientId);
        $successCount = 0;
        $createdCount = 0;
        $updatedCount = 0;
        $errors = [];

        // Mensagens de erro personalizadas
        $messages = [
            'required' => 'O campo :attribute é obrigatório.',
            'exists' => 'O :attribute não foi encontrado no sistema (Verifique cadastro).',
            'date' => 'Data inválida.',
            'numeric' => 'Deve ser um número válido (ex: 1200.50).',
            'string' => 'Deve ser texto.',
            'max' => 'Valor muito longo.',
            'unique' => 'Já cadastrado.',
        ];

        // Nomes amigáveis para os campos
        $customAttributes = [
            'case_number' => 'Número do Processo',
            'internal_number' => 'Número Interno',
            'action_object' => 'Causa de Pedir',
            'start_date' => 'Data de Distribuição',
            'opposing_party' => 'Autor',
            'defendant' => 'Réu',
            'user_id' => 'Advogado Responsável',
            'comarca' => 'Comarca',
            'city' => 'Cidade',
            'state' => 'UF',
            'special_court' => 'Juizado Especial',
            'cause_value' => 'Valor da Causa',
            'original_value' => 'Valor de Alçada',
            'agreement_value' => 'Proposta Inicial',
            'pcond_probability' => 'Valor da PCOND',
            'updated_condemnation_value' => 'Condenação Atualizada',
            'portal_agreement_offers' => 'Propostas Portal Acordos',
            'campaign_observations' => 'Observações Campanhas',
            'priority' => 'Prioridade',
            'description' => 'Observações',
            'opposing_lawyer' => 'Advogado Adverso',
        ];

        DB::beginTransaction();

        try {
            foreach ($casesToImport as $index => $caseData) {
                $caseData = $this->sanitizeImportCaseData($caseData);

                if ($this->shouldIgnoreImportedCaseRow($caseData)) {
                    continue;
                }

                $existingCase = $this->findExistingCaseForImport($caseData['case_number'] ?? null);
                if (empty($caseData['original_value'])) {
                    $caseData['original_value'] = $existingCase?->original_value ?? 0;
                }
                $caseData['has_alcada'] = $this->resolveImportedHasAlcada(
                    $caseData['original_value'] ?? null,
                    $existingCase
                );

                if ($existingCase) {
                    $payload = $this->buildExistingCaseAlcadaImportPayload($caseData, $existingCase);

                    $validator = Validator::make($payload, [
                        'case_number' => 'required|string|max:255',
                        'original_value' => 'required|numeric',
                        'has_alcada' => 'nullable|boolean',
                    ], $messages, $customAttributes);

                    if ($validator->fails()) {
                        $errors[] = [
                            'line' => "Registro " . ($index + 1),
                            'errors' => $validator->errors()->all(),
                        ];
                    } else {
                        try {
                            $existingCase->fill($payload);
                            $existingCase->save();
                            $updatedCount++;
                            $successCount++;
                        } catch (\Exception $e) {
                            $errors[] = [
                                'line' => "Registro " . ($index + 1),
                                'errors' => ["Erro técnico ao salvar (Verifique dados inválidos ou caracteres especiais): " . $e->getMessage()]
                            ];
                        }
                    }

                    continue;
                }

                $caseData = $this->applyImportPartyFallbacks($caseData, $clientName, $existingCase);

                if (empty($caseData['cause_value'])) {
                    $caseData['cause_value'] = $caseData['original_value'] ?? 0;
                }

                unset($caseData['updated_condemnation_value']);

                $responsibleUser = $this->resolveResponsibleUserFromImport($caseData);
                if ($responsibleUser) {
                    $caseData['user_id'] = $responsibleUser->id;
                    $caseData['lawyer_name'] = $responsibleUser->name;
                } else {
                    $caseData['user_id'] = null;
                }

                $caseData['client_id'] = $clientId;
                $caseData['status'] = $existingCase?->status ?? 'initial_analysis';
                $caseData['priority'] = !empty($caseData['priority'])
                    ? strtolower($caseData['priority'])
                    : ($existingCase?->priority ?? 'media');

                if (isset($caseData['special_court'])) {
                    $sc = strtolower((string) $caseData['special_court']);
                    $caseData['special_court'] = (
                        $sc === 's' ||
                        $sc === 'sim' ||
                        $sc === 'yes' ||
                        str_contains($sc, 'juizado')
                    )
                        ? 'Sim'
                        : 'Não';
                } else {
                    $caseData['special_court'] = $existingCase?->special_court ?? 'Não';
                }

                $caseData['start_date'] = $this->normalizeImportDate($caseData['start_date'] ?? null);
                $caseData = $this->syncImportParticipantReferences($caseData, $existingCase);

                $caseData = $this->resolveActionObjectPayload($caseData);

                $payload = $this->mergeImportPayloadWithExistingCase($caseData, $existingCase);

                $validator = Validator::make($payload, [
                    'case_number' => 'required|string|max:255',
                    'opposing_party' => 'required|string|max:255',
                    'defendant' => 'nullable|string|max:255',
                    'user_id' => 'nullable|exists:users,id',
                    'action_object' => 'nullable|string|max:255',
                    'action_object_id' => 'nullable|exists:action_objects,id',
                    'internal_number' => 'nullable|string|max:255',
                    'start_date' => 'nullable|date',
                    'comarca' => 'nullable|string|max:255',
                    'city' => 'nullable|string|max:255',
                    'state' => 'nullable|string|max:2',
                    'special_court' => 'nullable|string',
                    'cause_value' => 'nullable|numeric',
                    'original_value' => 'required|numeric',
                    'has_alcada' => 'nullable|boolean',
                    'agreement_value' => 'nullable|numeric',
                    'pcond_probability' => 'nullable|numeric|min:0',
                    'updated_condemnation_value' => 'nullable|numeric',
                    'priority' => 'nullable|string',
                    'description' => 'nullable|string',
                    'opposing_lawyer' => 'nullable|string',
                    'opposing_contact' => 'nullable|string',
                    'client_id' => 'required|exists:clients,id',
                    'status' => 'required|string',
                    'plaintiff_id' => 'nullable|exists:plaintiffs,id',
                    'defendant_id' => 'nullable|exists:defendants,id',
                    'opposing_lawyer_id' => 'nullable|exists:opposing_lawyers,id',
                ], $messages, $customAttributes);

                if ($validator->fails()) {
                    $errors[] = [
                        'line' => "Registro " . ($index + 1), 
                        'errors' => $validator->errors()->all()
                    ];
                } else {
                    try {
                        if ($existingCase) {
                            $originalCaseId = $existingCase->id;
                            $existingCase->fill($payload);
                            $existingCase->save();

                            if ((int) $existingCase->id !== (int) $originalCaseId) {
                                throw new \RuntimeException('O identificador do processo foi alterado durante a atualização.');
                            }

                            $updatedCount++;
                        } else {
                            LegalCase::create($payload);
                            $createdCount++;
                        }
                        $successCount++;
                    } catch (\Exception $e) {
                         $errors[] = [
                            'line' => "Registro " . ($index + 1), 
                            'errors' => ["Erro técnico ao salvar (Verifique dados inválidos ou caracteres especiais): " . $e->getMessage()]
                        ];
                    }
                }
            }

            if (!empty($errors)) {
                DB::rollBack();
                return response()->json([
                    'message' => 'A importação falhou. Corrija os erros listados abaixo e tente novamente.',
                    'success_count' => 0,
                    'created_count' => 0,
                    'updated_count' => 0,
                    'errors' => $errors,
                ], 422);
            }

            DB::commit();
            return response()->json([
                'message' => "Importação concluída! {$successCount} processos processados.",
                'success_count' => $successCount,
                'created_count' => $createdCount,
                'updated_count' => $updatedCount,
                'errors' => [],
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erro interno crítico no servidor.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Importa casos da planilha e remove alçada dos que não aparecem.
     */
    public function syncAlcada(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (!in_array($user->role, ['administrador', 'supervisor'])) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $validatedData = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'cases' => 'required|array|min:1',
        ]);

        $casesToImport = $validatedData['cases'];
        $clientId = $validatedData['client_id'];
        $clientName = $this->getImportClientName($clientId);
        $successCount = 0;
        $createdCount = 0;
        $updatedCount = 0;
        $errors = [];
        $processedCaseIds = [];

        $messages = [
            'required' => 'O campo :attribute é obrigatório.',
            'exists' => 'O :attribute não foi encontrado no sistema.',
            'date' => 'Data inválida.',
            'numeric' => 'Deve ser um número válido.',
            'string' => 'Deve ser texto.',
            'max' => 'Valor muito longo.',
        ];

        $customAttributes = [
            'case_number' => 'Número do Processo',
            'original_value' => 'Valor de Alçada',
            'opposing_party' => 'Autor',
            'defendant' => 'Réu',
            'user_id' => 'Advogado Responsável',
        ];

        DB::beginTransaction();

        try {
            foreach ($casesToImport as $index => $caseData) {
                $caseData = $this->sanitizeImportCaseData($caseData);

                if ($this->shouldIgnoreImportedCaseRow($caseData)) {
                    continue;
                }

                $existingCase = $this->findExistingCaseForImport($caseData['case_number'] ?? null);
                // Para sync de alçada, SEMPRE recalcular original_value do portal_agreement_offers
                if (!empty($caseData['portal_agreement_offers'])) {
                    $pendingValue = $this->extractCurrentPortalAgreementValue(
                        (string) $caseData['portal_agreement_offers']
                    );
                    if ($pendingValue !== null) {
                        $caseData['original_value'] = $pendingValue;
                    }
                }

                // Determinar has_alcada com base no original_value
                $originalValue = $caseData['original_value'] ?? $existingCase?->original_value ?? 0;
                if (is_string($originalValue)) {
                    $originalValue = (float) preg_replace('/[^\d.\-]/', '', str_replace(',', '.', str_replace('.', '', $originalValue)));
                }
                $hasAlcada = $originalValue > 0;

                if (empty($caseData['original_value'])) {
                    $caseData['original_value'] = $existingCase?->original_value ?? 0;
                }

                if ($existingCase) {
                    $payload = $this->buildExistingCaseAlcadaImportPayload($caseData, $existingCase);

                    $validator = Validator::make($payload, [
                        'case_number' => 'required|string|max:255',
                        'original_value' => 'nullable|numeric',
                        'has_alcada' => 'nullable|boolean',
                    ], $messages, $customAttributes);

                    if ($validator->fails()) {
                        $errors[] = [
                            'line' => "Registro " . ($index + 1),
                            'errors' => $validator->errors()->all()
                        ];
                    } else {
                        try {
                            $existingCase->fill($payload);
                            $existingCase->save();
                            $processedCaseIds[] = $existingCase->id;
                            $updatedCount++;
                            $successCount++;
                        } catch (\Exception $e) {
                            $errors[] = [
                                'line' => "Registro " . ($index + 1),
                                'errors' => ["Erro ao salvar: " . $e->getMessage()]
                            ];
                        }
                    }

                    continue;
                }

                $caseData = $this->applyImportPartyFallbacks($caseData, $clientName, $existingCase);

                if (empty($caseData['cause_value'])) {
                    $caseData['cause_value'] = $caseData['original_value'] ?? 0;
                }

                unset($caseData['updated_condemnation_value']);

                $responsibleUser = $this->resolveResponsibleUserFromImport($caseData);
                if ($responsibleUser) {
                    $caseData['user_id'] = $responsibleUser->id;
                    $caseData['lawyer_name'] = $responsibleUser->name;
                } else {
                    $caseData['user_id'] = null;
                }

                $caseData['client_id'] = $clientId;
                $caseData['status'] = $existingCase?->status ?? 'initial_analysis';
                $caseData['priority'] = !empty($caseData['priority'])
                    ? strtolower($caseData['priority'])
                    : ($existingCase?->priority ?? 'media');

                if (isset($caseData['special_court'])) {
                    $sc = strtolower((string) $caseData['special_court']);
                    $caseData['special_court'] = (
                        $sc === 's' || $sc === 'sim' || $sc === 'yes' || str_contains($sc, 'juizado')
                    ) ? 'Sim' : 'Não';
                } else {
                    $caseData['special_court'] = $existingCase?->special_court ?? 'Não';
                }

                $caseData['start_date'] = $this->normalizeImportDate($caseData['start_date'] ?? null);
                $caseData = $this->syncImportParticipantReferences($caseData, $existingCase);

                $caseData = $this->resolveActionObjectPayload($caseData);
                $payload = $this->mergeImportPayloadWithExistingCase($caseData, $existingCase);
                $payload['has_alcada'] = $hasAlcada;

                $validator = Validator::make($payload, [
                    'case_number' => 'required|string|max:255',
                    'opposing_party' => 'required|string|max:255',
                    'defendant' => 'nullable|string|max:255',
                    'user_id' => 'nullable|exists:users,id',
                    'action_object' => 'nullable|string|max:255',
                    'action_object_id' => 'nullable|exists:action_objects,id',
                    'internal_number' => 'nullable|string|max:255',
                    'start_date' => 'nullable|date',
                    'comarca' => 'nullable|string|max:255',
                    'cause_value' => 'nullable|numeric',
                    'original_value' => 'nullable|numeric',
                    'agreement_value' => 'nullable|numeric',
                    'pcond_probability' => 'nullable|numeric|min:0',
                    'priority' => 'nullable|string',
                    'description' => 'nullable|string',
                    'opposing_lawyer' => 'nullable|string',
                    'client_id' => 'required|exists:clients,id',
                    'status' => 'required|string',
                    'plaintiff_id' => 'nullable|exists:plaintiffs,id',
                    'defendant_id' => 'nullable|exists:defendants,id',
                    'opposing_lawyer_id' => 'nullable|exists:opposing_lawyers,id',
                ], $messages, $customAttributes);

                if ($validator->fails()) {
                    $errors[] = [
                        'line' => "Registro " . ($index + 1),
                        'errors' => $validator->errors()->all()
                    ];
                } else {
                    try {
                        if ($existingCase) {
                            $existingCase->fill($payload);
                            $existingCase->save();
                            $processedCaseIds[] = $existingCase->id;
                            $updatedCount++;
                        } else {
                            $newCase = LegalCase::create($payload);
                            $processedCaseIds[] = $newCase->id;
                            $createdCount++;
                        }
                        $successCount++;
                    } catch (\Exception $e) {
                        $errors[] = [
                            'line' => "Registro " . ($index + 1),
                            'errors' => ["Erro ao salvar: " . $e->getMessage()]
                        ];
                    }
                }
            }

            if (!empty($errors)) {
                DB::rollBack();
                return response()->json([
                    'message' => 'A sincronização falhou. Corrija os erros e tente novamente.',
                    'success_count' => 0,
                    'created_count' => 0,
                    'updated_count' => 0,
                    'zeroed_count' => 0,
                    'errors' => $errors,
                ], 422);
            }

            // --- PASSO DE SINCRONIZAÇÃO ---
            // Zerar alçada dos casos que NÃO vieram na planilha
            $zeroedCount = LegalCase::where('client_id', $clientId)
                ->where('has_alcada', true)
                ->whereNotIn('id', $processedCaseIds)
                ->update(['has_alcada' => false, 'original_value' => 0]);

            DB::commit();

            try {
                AuditService::log('sync_alcada', "Sincronização de alçada: {$updatedCount} atualizados, {$createdCount} criados, {$zeroedCount} removidos da alçada.");
            } catch (\Exception $e) {}

            return response()->json([
                'message' => "Sincronização concluída! {$successCount} processos processados, {$zeroedCount} removidos da alçada.",
                'success_count' => $successCount,
                'created_count' => $createdCount,
                'updated_count' => $updatedCount,
                'zeroed_count' => $zeroedCount,
                'errors' => [],
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erro interno crítico no servidor.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Atualização em Lote de Casos (Processos).
     */
    public function batchUpdate(Request $request): JsonResponse
    {
        if (Auth::user()?->role === 'indicador') {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $validated = $request->validate([
            'case_ids' => 'required|array',
            'case_ids.*' => 'exists:legal_cases,id',
            'action' => 'required|string|in:update_status,update_priority,transfer_user,add_tag,update_opposing_lawyer,delete',
            'value' => 'nullable', 
            'contra_indication_reason' => 'nullable|string|max:4000',
            'contra_indication_reason_id' => 'nullable|exists:contra_indication_reasons,id',
            'failed_deal_reason' => 'nullable|string|max:4000',
            'failed_deal_reason_id' => 'nullable|exists:failed_deal_reasons,id',
        ]);

        $caseIds = $validated['case_ids'];
        $action = $validated['action'];
        $value = $validated['value'] ?? null;
        $currentUser = Auth::user();
        $contraIndicationReason = trim((string) ($validated['contra_indication_reason'] ?? ''));
        $contraIndicationReasonId = $validated['contra_indication_reason_id'] ?? null;
        $failedDealReason = trim((string) ($validated['failed_deal_reason'] ?? ''));
        $failedDealReasonId = $validated['failed_deal_reason_id'] ?? null;

        if ($action === 'delete' && !in_array($currentUser?->role, ['administrador', 'admin'], true)) {
            return response()->json(['message' => 'Apenas administradores podem excluir processos em lote.'], 403);
        }

        if (
            $action === 'transfer_user'
            && !in_array($value, [null, '', self::UNASSIGNED_RESPONSIBLE_VALUE], true)
        ) {
            Validator::make(
                ['value' => $value],
                ['value' => ['required', 'integer', $this->activeOperatorUserExistsRule()]],
                [],
                ['value' => 'responsável do caso']
            )->validate();
        }

        if (
            $action === 'update_status'
            && $value === LegalCase::STATUS_CONTRA_INDICATED
            && empty($contraIndicationReasonId)
            && $contraIndicationReason === ''
        ) {
            throw ValidationException::withMessages([
                'contra_indication_reason_id' => 'Selecione o motivo da contraindicação.',
            ]);
        }

        if (
            $action === 'update_status'
            && $value === LegalCase::STATUS_FAILED_DEAL
            && empty($failedDealReasonId)
            && $failedDealReason === ''
        ) {
            throw ValidationException::withMessages([
                'failed_deal_reason_id' => 'Selecione o motivo do acordo frustrado.',
            ]);
        }

        DB::beginTransaction();
        try {
            $query = LegalCase::whereIn('id', $caseIds);
            $count = $query->count();
            $logDetails = "";

            switch ($action) {
                case 'update_status':
                    $statusStartedAt = Carbon::now();
                    $casesToUpdate = (clone $query)
                        ->where('status', '<>', $value)
                        ->get([
                            'id',
                            'case_number',
                            'status',
                            'contra_indication_reason',
                            'contra_indication_reason_id',
                            'contra_indicated_at',
                            'contra_indicated_by_user_id',
                            'failed_deal_reason',
                            'failed_deal_reason_id',
                            'failed_deal_at',
                            'failed_deal_by_user_id',
                        ]);

                    $changedCaseIds = $casesToUpdate->pluck('id')->all();
                    $count = count($changedCaseIds);

                    if ($count > 0) {
                        $statusUpdatePayload = [
                            'status' => $value,
                            'status_started_at' => $statusStartedAt,
                            'updated_at' => $statusStartedAt,
                        ];

                        if ($value === LegalCase::STATUS_CONTRA_INDICATED) {
                            $statusUpdatePayload['contra_indication_reason'] = $contraIndicationReason !== '' ? $contraIndicationReason : null;
                            $statusUpdatePayload['contra_indication_reason_id'] = $contraIndicationReasonId;
                            $statusUpdatePayload['contra_indicated_at'] = $statusStartedAt;
                            $statusUpdatePayload['contra_indicated_by_user_id'] = Auth::id();
                        } else {
                            $statusUpdatePayload['contra_indication_reason'] = null;
                            $statusUpdatePayload['contra_indication_reason_id'] = null;
                            $statusUpdatePayload['contra_indicated_at'] = null;
                            $statusUpdatePayload['contra_indicated_by_user_id'] = null;
                        }

                        if ($value === LegalCase::STATUS_FAILED_DEAL) {
                            $statusUpdatePayload['failed_deal_reason'] = $failedDealReason !== '' ? $failedDealReason : null;
                            $statusUpdatePayload['failed_deal_reason_id'] = $failedDealReasonId;
                            $statusUpdatePayload['failed_deal_at'] = $statusStartedAt;
                            $statusUpdatePayload['failed_deal_by_user_id'] = Auth::id();
                        } else {
                            $statusUpdatePayload['failed_deal_reason'] = null;
                            $statusUpdatePayload['failed_deal_reason_id'] = null;
                            $statusUpdatePayload['failed_deal_at'] = null;
                            $statusUpdatePayload['failed_deal_by_user_id'] = null;
                        }

                        LegalCase::whereIn('id', $changedCaseIds)->update($statusUpdatePayload);

                        $historyRows = $casesToUpdate->map(function (LegalCase $caseToUpdate) use ($value, $statusStartedAt, $contraIndicationReason, $contraIndicationReasonId, $failedDealReason, $failedDealReasonId) {
                            $oldValues = ['status' => $caseToUpdate->status];
                            $newValues = ['status' => $value];

                            if ($value === LegalCase::STATUS_CONTRA_INDICATED) {
                                $newValues['contra_indication_reason'] = $contraIndicationReason;
                                $newValues['contra_indication_reason_id'] = $contraIndicationReasonId;
                            } elseif ($caseToUpdate->status === LegalCase::STATUS_CONTRA_INDICATED) {
                                $oldValues['contra_indication_reason'] = $caseToUpdate->contra_indication_reason;
                                $newValues['contra_indication_reason'] = null;
                            }

                            if ($value === LegalCase::STATUS_FAILED_DEAL) {
                                $newValues['failed_deal_reason'] = $failedDealReason;
                                $newValues['failed_deal_reason_id'] = $failedDealReasonId;
                            } elseif ($caseToUpdate->status === LegalCase::STATUS_FAILED_DEAL) {
                                $oldValues['failed_deal_reason'] = $caseToUpdate->failed_deal_reason;
                                $newValues['failed_deal_reason'] = null;
                            }

                            return [
                                'legal_case_id' => $caseToUpdate->id,
                                'user_id' => Auth::id(),
                                'event_type' => 'update',
                                'description' => 'Status atualizado em lote.',
                                'old_values' => json_encode($oldValues),
                                'new_values' => json_encode($newValues),
                                'created_at' => $statusStartedAt,
                                'updated_at' => $statusStartedAt,
                            ];
                        })->all();

                        DB::table('case_histories')->insert($historyRows);
                    }

                    $logDetails = "Alterou status de {$count} processos para '{$value}'";
                    if ($value === LegalCase::STATUS_CONTRA_INDICATED) {
                        $logDetails .= " com justificativa de contraindicação";
                    }
                    break;

                case 'update_priority':
                    $query->update(['priority' => $value]);
                    $logDetails = "Alterou prioridade de {$count} processos para '{$value}'";
                    break;

                case 'transfer_user':
                    $responsibleUserId = in_array($value, [null, '', self::UNASSIGNED_RESPONSIBLE_VALUE], true)
                        ? null
                        : (int) $value;

                    $query->update(['user_id' => $responsibleUserId]);

                    if ($responsibleUserId === null) {
                        $logDetails = "Removeu o responsável de {$count} processos";
                        break;
                    }

                    $newOwner = User::find($responsibleUserId);
                    $ownerName = $newOwner ? $newOwner->name : 'ID ' . $responsibleUserId;
                    $logDetails = "Transferiu {$count} processos para {$ownerName}";
                    break;
                
                case 'update_opposing_lawyer':
                    $query->update(['opposing_lawyer_id' => $value]);
                    $logDetails = "Vinculou advogado adverso (ID {$value}) em {$count} processos";
                    break;

                case 'add_tag':
                    $normalizedTag = CaseTag::normalizeTag($value);
                    if ($normalizedTag === null) {
                        throw new \InvalidArgumentException('Etiqueta inválida para a ação em lote.');
                    }

                    $cases = $query->get();
                    foreach($cases as $case) {
                        $currentTags = CaseTag::normalizeCollection($case->tags ?? []);
                        $updatedTags = CaseTag::normalizeCollection(array_merge($currentTags, [$normalizedTag]));

                        if ($updatedTags !== $currentTags) {
                            $case->update(['tags' => $updatedTags]);
                        }
                    }
                    $this->syncCaseTagCatalog([$normalizedTag]);
                    $logDetails = "Adicionou a tag '{$normalizedTag['text']}' em {$count} processos";
                    break;

                case 'delete':
                    // Captura os números para o log antes de deletar
                    $deletedNumbers = $query->limit(5)->pluck('case_number')->toArray();
                    $deletedString = implode(', ', $deletedNumbers) . ($count > 5 ? '...' : '');
                    
                    $query->delete();
                    $logDetails = "Excluiu {$count} processos (Ex: {$deletedString})";
                    break;
            }

            // Log de Auditoria
            try {
                AuditLog::create([
                    'user_id' => auth()->id(),
                    'user_name' => auth()->user() ? auth()->user()->name : 'Sistema',
                    'action' => 'Ação em Lote (Processos)',
                    'details' => $logDetails,
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Exception $e) {
                Log::error("Erro AuditLog batchUpdate: " . $e->getMessage());
            }

            DB::commit();
            return response()->json(['message' => 'Lote processado com sucesso.', 'affected_count' => $count]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erro ao processar lote: ' . $e->getMessage()], 500);
        }
    }

    private function sanitizeImportCaseData(array $caseData): array
    {
        unset(
            $caseData['id'],
            $caseData['created_at'],
            $caseData['updated_at'],
            $caseData['status_started_at'],
            $caseData['deleted_at']
        );

        if (isset($caseData['case_number'])) {
            $caseData['case_number'] = $this->normalizeImportedCaseNumber((string) $caseData['case_number']);
        }

        if (
            (empty($caseData['original_value']) || $caseData['original_value'] === '0')
            && !empty($caseData['portal_agreement_offers'])
        ) {
            $pendingAgreementValue = $this->extractCurrentPortalAgreementValue(
                (string) $caseData['portal_agreement_offers']
            );

            if ($pendingAgreementValue !== null) {
                $caseData['original_value'] = $pendingAgreementValue;
            }
        }

        $moneyFields = ['cause_value', 'original_value', 'agreement_value', 'pcond_probability', 'updated_condemnation_value'];
        foreach ($moneyFields as $field) {
            if (!array_key_exists($field, $caseData)) {
                continue;
            }

            $value = $caseData[$field];
            if (is_string($value)) {
                $value = trim($value);
                if (strpos($value, ',') !== false) {
                    $value = str_replace('.', '', $value);
                    $value = str_replace(',', '.', $value);
                }
                $value = preg_replace('/[^\d.\-]/', '', $value);
            }

            $caseData[$field] = ($value === '' || $value === null) ? null : $value;
        }

        foreach (['opposing_party', 'defendant', 'opposing_lawyer'] as $partyField) {
            if (!empty($caseData[$partyField])) {
                $caseData[$partyField] = $this->extractPrimaryParticipantName((string) $caseData[$partyField]);
            }
        }

        foreach ([
            'opposing_party' => 255,
            'defendant' => 255,
            'action_object' => 255,
            'lawyer_name' => 255,
            'comarca' => 255,
            'city' => 255,
            'state' => 2,
            'special_court' => 255,
            'opposing_lawyer' => 255,
            'internal_number' => 255,
            'polo' => 50,
            'portal_agreement_offers' => 65535,
            'campaign_observations' => 65535,
            'description' => 65535,
        ] as $field => $limit) {
            if (!empty($caseData[$field]) && is_string($caseData[$field])) {
                $caseData[$field] = mb_substr(trim($caseData[$field]), 0, $limit);
            }
        }

        foreach ($caseData as $key => $value) {
            if ($value === '' || $value === null) {
                $caseData[$key] = null;
            }
        }

        return $caseData;
    }

    private function activeOperatorUserExistsRule()
    {
        return Rule::exists('users', 'id')->where(function ($query) {
            $query
                ->where('role', 'operador')
                ->where('status', 'ativo');
        });
    }

    private function getImportClientName(int|string|null $clientId): ?string
    {
        if (empty($clientId)) {
            return null;
        }

        return Client::query()->whereKey($clientId)->value('name');
    }

    private function applyImportPartyFallbacks(array $caseData, ?string $clientName, ?LegalCase $existingCase): array
    {
        $normalizedPolo = $this->normalizeImportComparableText((string) ($caseData['polo'] ?? ''));
        $existingOpposingParty = trim((string) ($existingCase?->opposing_party ?? ''));
        $existingDefendant = trim((string) ($existingCase?->defendant ?? ''));
        $defaultPlaintiff = 'Parte autora não informada na planilha do banco';
        $defaultDefendant = $clientName ?: 'Parte passiva não informada na planilha do banco';

        if (empty($caseData['opposing_party'])) {
            if ($existingOpposingParty !== '') {
                $caseData['opposing_party'] = $existingOpposingParty;
            } elseif (str_contains($normalizedPolo, 'ativo') && $clientName) {
                $caseData['opposing_party'] = $clientName;
            } else {
                $caseData['opposing_party'] = $defaultPlaintiff;
            }
        }

        if (empty($caseData['defendant'])) {
            if ($existingDefendant !== '') {
                $caseData['defendant'] = $existingDefendant;
            } elseif (str_contains($normalizedPolo, 'ativo')) {
                $caseData['defendant'] = 'Parte passiva não informada na planilha do banco';
            } else {
                $caseData['defendant'] = $defaultDefendant;
            }
        }

        return $caseData;
    }

    private function syncImportParticipantReferences(array $caseData, ?LegalCase $existingCase): array
    {
        if (!empty($caseData['opposing_party'])) {
            $plaintiff = Plaintiff::firstOrCreate(['name' => trim($caseData['opposing_party'])]);
            $caseData['plaintiff_id'] = $plaintiff->id;
        } elseif ($existingCase?->plaintiff_id) {
            $caseData['plaintiff_id'] = $existingCase->plaintiff_id;
        }

        if (!empty($caseData['defendant'])) {
            $defendant = Defendant::firstOrCreate(['name' => trim($caseData['defendant'])]);
            $caseData['defendant_id'] = $defendant->id;
        } elseif ($existingCase?->defendant_id) {
            $caseData['defendant_id'] = $existingCase->defendant_id;
        }

        if (!empty($caseData['opposing_lawyer'])) {
            $opLawyer = OpposingLawyer::firstOrCreate(['name' => trim($caseData['opposing_lawyer'])]);
            $caseData['opposing_lawyer_id'] = $opLawyer->id;
        } elseif ($existingCase?->opposing_lawyer_id) {
            $caseData['opposing_lawyer_id'] = $existingCase->opposing_lawyer_id;
        }

        return $caseData;
    }

    private function findExistingCaseForImport(?string $caseNumber): ?LegalCase
    {
        if (empty($caseNumber)) {
            return null;
        }

        $normalizedCaseNumber = $this->normalizeImportedCaseNumber($caseNumber);
        $cleanCaseNumber = preg_replace('/\D/', '', $normalizedCaseNumber);
        $formattedCaseNumber = $this->formatCnJCaseNumber($cleanCaseNumber);
        $candidates = array_values(array_filter(array_unique([
            $caseNumber,
            $normalizedCaseNumber,
            $cleanCaseNumber,
            $formattedCaseNumber,
        ])));

        return LegalCase::query()
            ->where(function ($query) use ($candidates, $cleanCaseNumber) {
                if (!empty($candidates)) {
                    $query->whereIn('case_number', $candidates);
                }

                if ($cleanCaseNumber !== '') {
                    $query->orWhereRaw(
                        "REPLACE(REPLACE(REPLACE(REPLACE(case_number, '-', ''), '.', ''), '/', ''), ' ', '') = ?",
                        [$cleanCaseNumber]
                    );
                }
            })
            ->orderBy('id')
            ->first();
    }

    private function normalizeImportDate(mixed $dateValue): ?string
    {
        if ($dateValue === null || $dateValue === '') {
            return null;
        }

        if (is_numeric($dateValue)) {
            try {
                return \Carbon\Carbon::create(1899, 12, 30)
                    ->addDays((int) floor((float) $dateValue))
                    ->format('Y-m-d');
            } catch (\Throwable $e) {
            }
        }

        $formats = [
            'd/m/Y',
            'd-m-Y',
            'Y-m-d',
            'Y-m-d H:i:s',
            'm/d/Y',
            'm/d/y',
            'd/m/Y H:i:s',
        ];

        foreach ($formats as $format) {
            try {
                return \Carbon\Carbon::createFromFormat($format, (string) $dateValue)->format('Y-m-d');
            } catch (\Throwable $e) {
            }
        }

        try {
            return \Carbon\Carbon::parse((string) $dateValue)->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function mergeImportPayloadWithExistingCase(array $caseData, ?LegalCase $existingCase): array
    {
        $payload = [
            'case_number' => $existingCase?->case_number ?? $caseData['case_number'],
            'internal_number' => $caseData['internal_number'] ?? $existingCase?->internal_number,
            'client_id' => $caseData['client_id'] ?? $existingCase?->client_id,
            'user_id' => array_key_exists('user_id', $caseData)
                ? $caseData['user_id']
                : $existingCase?->user_id,
            'opposing_party' => $caseData['opposing_party'] ?? $existingCase?->opposing_party,
            'plaintiff_id' => $caseData['plaintiff_id'] ?? $existingCase?->plaintiff_id,
            'defendant' => $caseData['defendant'] ?? $existingCase?->defendant,
            'defendant_id' => $caseData['defendant_id'] ?? $existingCase?->defendant_id,
            'action_object' => $caseData['action_object'] ?? $existingCase?->action_object ?? $existingCase?->actionObject?->name,
            'action_object_id' => $caseData['action_object_id'] ?? $existingCase?->action_object_id,
            'description' => $caseData['description'] ?? $existingCase?->description,
            'status' => $caseData['status'] ?? $existingCase?->status ?? 'initial_analysis',
            'priority' => $caseData['priority'] ?? $existingCase?->priority ?? 'media',
            'original_value' => $caseData['original_value'] ?? $existingCase?->original_value ?? 0,
            'has_alcada' => $caseData['has_alcada'] ?? $existingCase?->has_alcada ?? false,
            'agreement_value' => $caseData['agreement_value'] ?? $existingCase?->agreement_value,
            'cause_value' => $caseData['cause_value'] ?? $existingCase?->cause_value ?? 0,
            'pcond_probability' => $caseData['pcond_probability'] ?? $existingCase?->pcond_probability,
            'updated_condemnation_value' => $caseData['updated_condemnation_value'] ?? $existingCase?->updated_condemnation_value,
            'opposing_lawyer_id' => $caseData['opposing_lawyer_id'] ?? $existingCase?->opposing_lawyer_id,
            'comarca' => $caseData['comarca'] ?? $existingCase?->comarca,
            'state' => $caseData['state'] ?? $existingCase?->state,
            'city' => $caseData['city'] ?? $existingCase?->city,
            'special_court' => $caseData['special_court'] ?? $existingCase?->special_court ?? 'Não',
            'opposing_lawyer' => $caseData['opposing_lawyer'] ?? $existingCase?->opposing_lawyer,
            'opposing_contact' => $caseData['opposing_contact'] ?? $existingCase?->opposing_contact,
            'tags' => $existingCase?->tags,
            'agreement_probability' => $caseData['agreement_probability'] ?? $existingCase?->agreement_probability,
            'agreement_checklist_data' => $existingCase?->agreement_checklist_data,
            'start_date' => $caseData['start_date'] ?? $existingCase?->start_date,
        ];

        return array_filter(
            $payload,
            static fn ($value) => $value !== ''
        );
    }

    private function buildExistingCaseAlcadaImportPayload(array $caseData, LegalCase $existingCase): array
    {
        return [
            'case_number' => $existingCase->case_number,
            'original_value' => $caseData['original_value'] ?? $existingCase->original_value ?? 0,
            'has_alcada' => $caseData['has_alcada'] ?? $existingCase->has_alcada ?? false,
        ];
    }

    private function resolveImportedHasAlcada(mixed $originalValue, ?LegalCase $existingCase): bool
    {
        if ($originalValue === null || $originalValue === '') {
            return (bool) ($existingCase?->has_alcada ?? false);
        }

        if (is_bool($originalValue)) {
            return $originalValue;
        }

        if (is_numeric($originalValue)) {
            return (float) $originalValue > 0;
        }

        $normalizedValue = trim((string) $originalValue);
        if ($normalizedValue === '') {
            return (bool) ($existingCase?->has_alcada ?? false);
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

    private function extractCurrentPortalAgreementValue(string $rawValue): ?string
    {
        if (trim($rawValue) === '') {
            return null;
        }

        $matchingValues = [];

        foreach (preg_split('/\\s*\\|\\|\\s*/', $rawValue) ?: [] as $entry) {
            $entry = trim((string) $entry);
            if ($entry === '') {
                continue;
            }

            if (!preg_match('/R\\$\\s*([0-9.,]+)/i', $entry, $valueMatches)) {
                continue;
            }

            $parts = array_values(array_filter(
                array_map('trim', explode('|', $entry)),
                static fn ($value) => $value !== ''
            ));

            $status = end($parts) ?: '';

            if (! $this->isCurrentPortalAgreementStatus((string) $status)) {
                continue;
            }

            $matchingValues[] = $valueMatches[1];
        }

        if (empty($matchingValues)) {
            return null;
        }

        return end($matchingValues) ?: null;
    }

    private function isCurrentPortalAgreementStatus(string $status): bool
    {
        $normalizedStatus = $this->normalizeImportComparableText($status);

        if ($normalizedStatus === '') {
            return false;
        }

        foreach ([
            '/^em tratamento$/',
            '/^pendente$/',
            '/^devolvida com contraproposta$/',
            '/^contraproposta recusada$/',
            '/^contraproposta aceita$/',
            '/^contato frustrado$/',
            '/^acordo frustrado$/',
            '/^aguardando (a )?avaliacao da (contra)?proposta( vencida)?$/',
            '/^aguardando (a )?analise da contraproposta$/',
        ] as $pattern) {
            if (preg_match($pattern, $normalizedStatus) === 1) {
                return true;
            }
        }

        return false;
    }

    private function shouldIgnoreImportedCaseRow(array $caseData): bool
    {
        $nonEmptyFields = array_filter(
            $caseData,
            static fn ($value) => $value !== null && trim((string) $value) !== ''
        );

        if (empty($nonEmptyFields)) {
            return true;
        }

        if (!empty($caseData['case_number'])) {
            return false;
        }

        if (count($nonEmptyFields) !== 1) {
            return false;
        }

        $field = array_key_first($nonEmptyFields);
        if ($field !== 'internal_number') {
            return false;
        }

        $normalizedValue = $this->normalizeImportComparableText((string) $nonEmptyFields[$field]);

        foreach ([
            'filtros aplicados',
            'filtro aplicado',
            'situacao_proposta',
            'situacao proposta',
            'toggle',
            'polo',
        ] as $keyword) {
            if (str_contains($normalizedValue, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function resolveResponsibleUserFromImport(array $caseData): ?User
    {
        foreach (['user_id', 'lawyer_id'] as $field) {
            $candidateId = $caseData[$field] ?? null;
            if ($candidateId === null || $candidateId === '' || !is_numeric($candidateId)) {
                continue;
            }

            $matchedUser = User::query()
                ->where('role', 'operador')
                ->where('status', 'ativo')
                ->find((int) $candidateId);
            if ($matchedUser) {
                return $matchedUser;
            }
        }

        $candidates = array_values(array_filter([
            is_string($caseData['lawyer_name'] ?? null) ? trim((string) $caseData['lawyer_name']) : null,
            is_string($caseData['campaign_observations'] ?? null) ? trim((string) $caseData['campaign_observations']) : null,
        ], static fn ($value) => !empty($value)));

        foreach ($candidates as $candidate) {
            $matchedUser = $this->findUserByImportedResponsible($candidate);
            if ($matchedUser) {
                return $matchedUser;
            }
        }

        return null;
    }

    private function findUserByImportedResponsible(string $candidate): ?User
    {
        $trimmedCandidate = trim($candidate);
        if ($trimmedCandidate === '') {
            return null;
        }

        $directMatch = User::query()
            ->where('status', 'ativo')
            ->where('role', 'operador')
            ->where('name', 'LIKE', '%' . $trimmedCandidate . '%')
            ->orderBy('id')
            ->first();

        if ($directMatch) {
            return $directMatch;
        }

        $normalizedCandidate = $this->normalizeImportedResponsibleText($trimmedCandidate);
        if ($normalizedCandidate === '') {
            return null;
        }

        $bestMatch = null;
        $bestScore = 0;

        foreach ($this->getResponsibleUserDirectory() as $entry) {
            $score = 0;

            foreach ($entry['aliases'] as $alias) {
                if ($alias !== '' && str_contains($normalizedCandidate, $alias)) {
                    $score = max($score, strlen($alias));
                }
            }

            if ($score > $bestScore) {
                $bestMatch = $entry['user'];
                $bestScore = $score;
                continue;
            }

            if ($score !== 0 && $score === $bestScore) {
                $bestMatch = null;
            }
        }

        return $bestScore >= 4 ? $bestMatch : null;
    }

    private function getResponsibleUserDirectory(): array
    {
        static $directory = null;

        if ($directory !== null) {
            return $directory;
        }

        $users = User::query()
            ->where('status', 'ativo')
            ->where('role', 'operador')
            ->orderBy('id')
            ->get(['id', 'name', 'status', 'role']);

        $tokenFrequency = [];
        foreach ($users as $user) {
            foreach ($this->extractResponsibleNameTokens($user->name) as $token) {
                $tokenFrequency[$token] = ($tokenFrequency[$token] ?? 0) + 1;
            }
        }

        $directory = [];
        foreach ($users as $user) {
            $normalizedName = $this->normalizeImportedResponsibleText($user->name);
            $nameParts = array_values(array_filter(explode(' ', $normalizedName)));
            $aliases = [$normalizedName];

            if (count($nameParts) >= 2) {
                $aliases[] = $nameParts[0] . ' ' . $nameParts[1];
            }

            foreach ($this->extractResponsibleNameTokens($user->name) as $token) {
                if (($tokenFrequency[$token] ?? 0) === 1) {
                    $aliases[] = $token;
                }
            }

            $directory[] = [
                'user' => $user,
                'aliases' => array_values(array_unique(array_filter($aliases))),
            ];
        }

        return $directory;
    }

    private function extractResponsibleNameTokens(string $value): array
    {
        $normalizedValue = $this->normalizeImportedResponsibleText($value);
        if ($normalizedValue === '') {
            return [];
        }

        $stopWords = ['da', 'das', 'de', 'do', 'dos', 'e'];
        $parts = preg_split('/\s+/', $normalizedValue) ?: [];

        return array_values(array_filter(array_unique($parts), static function ($part) use ($stopWords) {
            return strlen($part) >= 4 && !in_array($part, $stopWords, true);
        }));
    }

    private function normalizeImportedResponsibleText(?string $value): string
    {
        return $this->normalizeImportComparableText($value);
    }

    private function normalizeImportComparableText(?string $value): string
    {
        $normalizedValue = trim((string) $value);

        if ($normalizedValue === '') {
            return '';
        }

        if (preg_match('/[ÃÂ]/u', $normalizedValue)) {
            $repairedValue = @mb_convert_encoding($normalizedValue, 'ISO-8859-1', 'UTF-8');
            if (is_string($repairedValue) && trim($repairedValue) !== '') {
                $normalizedValue = $repairedValue;
            }
        }

        $normalizedValue = mb_strtolower($normalizedValue);

        $asciiValue = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalizedValue);
        if ($asciiValue !== false) {
            $normalizedValue = $asciiValue;
        }

        $normalizedValue = preg_replace('/[^a-z0-9\s]/', ' ', $normalizedValue);
        $normalizedValue = preg_replace('/\s+/', ' ', $normalizedValue);

        return trim((string) $normalizedValue);
    }

    private function resolveActionObjectPayload(array $payload): array
    {
        $actionObjectId = $payload['action_object_id'] ?? null;

        if (!empty($actionObjectId)) {
            $actionObject = ActionObject::find($actionObjectId);

            if ($actionObject) {
                $payload['action_object_id'] = $actionObject->id;
                $payload['action_object'] = $actionObject->name;

                return $payload;
            }
        }

        if (!array_key_exists('action_object', $payload)) {
            return $payload;
        }

        $actionObjectName = trim((string) ($payload['action_object'] ?? ''));

        if ($actionObjectName === '') {
            $payload['action_object'] = null;

            if (empty($payload['action_object_id'])) {
                $payload['action_object_id'] = null;
            }

            return $payload;
        }

        $actionObject = ActionObject::firstOrCreate([
            'name' => mb_substr($actionObjectName, 0, 255),
        ]);

        $payload['action_object_id'] = $actionObject->id;
        $payload['action_object'] = $actionObject->name;

        return $payload;
    }

    private function normalizeSettlementBenefitPayload(array $payload): array
    {
        return [
            'ourocap_value' => $this->normalizeNullableScalar($payload['ourocap_value'] ?? null),
            'livelo_points' => $this->normalizeNullableScalar($payload['livelo_points'] ?? null),
        ];
    }

    private function normalizeNullableScalar(mixed $value): mixed
    {
        if (!is_string($value)) {
            return $value;
        }

        $normalizedValue = trim($value);

        return $normalizedValue === '' ? null : $normalizedValue;
    }

    private function ourocapValidationRules(Request $request, ?LegalCase $case = null): array
    {
        return [
            'nullable',
            'numeric',
            'min:500',
            function (string $attribute, mixed $value, \Closure $fail) use ($request, $case) {
                $liveloPoints = $request->input('livelo_points', $case?->livelo_points);

                if ($this->hasFilledValue($value) && $this->hasFilledValue($liveloPoints)) {
                    $fail('O caso pode ter Ourocap ou Livelo, mas não ambos ao mesmo tempo.');
                }
            },
        ];
    }

    private function liveloPointsValidationRules(Request $request, ?LegalCase $case = null): array
    {
        return [
            'nullable',
            'integer',
            'min:5000',
            function (string $attribute, mixed $value, \Closure $fail) use ($request, $case) {
                $ourocapValue = $request->input('ourocap_value', $case?->ourocap_value);

                if ($this->hasFilledValue($value) && $this->hasFilledValue($ourocapValue)) {
                    $fail('O caso pode ter Livelo ou Ourocap, mas não ambos ao mesmo tempo.');
                }
            },
        ];
    }

    private function hasFilledValue(mixed $value): bool
    {
        if ($value === null) {
            return false;
        }

        if (is_string($value)) {
            return trim($value) !== '';
        }

        return true;
    }

    private function buildSearchFeedback(Request $request, ?User $user, int $visibleTotal): ?array
    {
        $searchTerm = trim((string) $request->input('search', ''));

        if ($searchTerm === '' || $visibleTotal > 0) {
            return null;
        }

        $multipleCaseNumberTerms = $this->extractMultipleCaseNumberTerms($searchTerm);
        if ($multipleCaseNumberTerms !== []) {
            $totalTerms = count($multipleCaseNumberTerms);
            $matchedCount = min($this->countExistingCaseNumberMatches($multipleCaseNumberTerms), $totalTerms);
            $missingCount = max($totalTerms - $matchedCount, 0);

            if ($matchedCount === 0) {
                return [
                    'type' => 'case_number_list_not_found',
                    'total_terms' => $totalTerms,
                ];
            }

            return [
                'type' => 'case_number_list_filtered_out',
                'total_terms' => $totalTerms,
                'matched_count' => $matchedCount,
                'missing_count' => $missingCount,
            ];
        }

        if (!$this->isCaseNumberSearch($searchTerm)) {
            return [
                'type' => 'no_results',
                'search' => $searchTerm,
            ];
        }

        $normalizedSearchTerm = preg_replace('/\D/', '', $searchTerm);
        $caseExistsInBase = LegalCase::query()
            ->where('case_number', 'like', '%' . $searchTerm . '%')
            ->when($normalizedSearchTerm !== '', function ($query) use ($normalizedSearchTerm) {
                $query->orWhereRaw(
                    $this->normalizedCaseNumberSql() . ' like ?',
                    ['%' . $normalizedSearchTerm . '%']
                );
            })
            ->exists();

        if (!$caseExistsInBase) {
            return [
                'type' => 'case_number_not_found',
                'search' => $searchTerm,
            ];
        }

        return [
            'type' => 'case_number_filtered_out',
            'search' => $searchTerm,
        ];
    }

    private function applySearchFilter($query, string $searchTerm): void
    {
        $trimmedSearchTerm = trim($searchTerm);

        if ($trimmedSearchTerm === '') {
            return;
        }

        $multipleCaseNumberTerms = $this->extractMultipleCaseNumberTerms($trimmedSearchTerm);

        if ($multipleCaseNumberTerms !== []) {
            $query->whereIn(DB::raw($this->normalizedCaseNumberSql()), $multipleCaseNumberTerms);

            return;
        }

        $isCaseNumberSearch = $this->isCaseNumberSearch($trimmedSearchTerm);
        $normalizedCaseNumberSearch = preg_replace('/\D/', '', $trimmedSearchTerm);

        $query->where(function ($q) use ($trimmedSearchTerm, $isCaseNumberSearch, $normalizedCaseNumberSearch) {
            $q->where('case_number', 'like', "%{$trimmedSearchTerm}%")
                ->when($isCaseNumberSearch && $normalizedCaseNumberSearch !== '', function ($caseNumberQuery) use ($normalizedCaseNumberSearch) {
                    $caseNumberQuery->orWhereRaw(
                        $this->normalizedCaseNumberSql() . ' like ?',
                        ['%' . $normalizedCaseNumberSearch . '%']
                    );
                })
                ->orWhere('opposing_party', 'like', "%{$trimmedSearchTerm}%")
                ->orWhereHas('plaintiff', function ($q2) use ($trimmedSearchTerm) {
                    $q2->where('name', 'like', "%{$trimmedSearchTerm}%");
                })
                ->orWhereHas('defendantRel', function ($q3) use ($trimmedSearchTerm) {
                    $q3->where('name', 'like', "%{$trimmedSearchTerm}%");
                });
        });
    }

    private function extractMultipleCaseNumberTerms(string $searchTerm): array
    {
        $terms = $this->extractCaseNumberSearchTerms($searchTerm, self::MULTI_CASE_NUMBER_MIN_DIGITS);

        return count($terms) > 1 ? $terms : [];
    }

    private function extractCaseNumberSearchTerms(string $searchTerm, int $minimumDigits = 7): array
    {
        $trimmedSearch = trim($searchTerm);

        if ($trimmedSearch === '') {
            return [];
        }

        $parts = preg_split('/[\s,;]+/u', $trimmedSearch) ?: [];
        $normalizedTerms = [];

        foreach ($parts as $part) {
            $candidate = trim((string) $part);
            $candidate = trim($candidate, "\"'");

            if ($candidate === '') {
                continue;
            }

            if (!preg_match('/^[0-9.\-\/]+$/', $candidate)) {
                return [];
            }

            $normalizedCaseNumber = preg_replace('/\D/', '', $candidate);

            if ($normalizedCaseNumber === '' || strlen($normalizedCaseNumber) < $minimumDigits) {
                return [];
            }

            $normalizedTerms[$normalizedCaseNumber] = $normalizedCaseNumber;
        }

        return array_values($normalizedTerms);
    }

    private function countExistingCaseNumberMatches(array $normalizedCaseNumbers): int
    {
        if ($normalizedCaseNumbers === []) {
            return 0;
        }

        return (int) LegalCase::query()
            ->whereIn(DB::raw($this->normalizedCaseNumberSql()), $normalizedCaseNumbers)
            ->count();
    }

    private function isCaseNumberSearch(string $searchTerm): bool
    {
        $trimmedSearch = trim($searchTerm);

        if ($trimmedSearch === '') {
            return false;
        }

        if ($this->extractMultipleCaseNumberTerms($trimmedSearch) !== []) {
            return true;
        }

        if (!preg_match('/^[0-9.\-\/\s]+$/', $trimmedSearch)) {
            return false;
        }

        return strlen(preg_replace('/\D/', '', $trimmedSearch)) >= 7;
    }

    private function normalizedCaseNumberSql(string $column = 'case_number'): string
    {
        return "REPLACE(REPLACE(REPLACE(REPLACE({$column}, '.', ''), '-', ''), '/', ''), ' ', '')";
    }

    private function normalizeImportedCaseNumber(string $caseNumber): string
    {
        $cleanNumber = preg_replace('/\D/', '', $caseNumber);

        if ($cleanNumber === '') {
            return '';
        }

        return $this->formatCnJCaseNumber($cleanNumber);
    }

    private function formatCnJCaseNumber(string $cleanNumber): string
    {
        if (strlen($cleanNumber) === 20) {
            return preg_replace(
                "/(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/",
                "\$1-\$2.\$3.\$4.\$5.\$6",
                $cleanNumber
            );
        }

        return $cleanNumber;
    }

    private function extractPrimaryParticipantName(string $rawValue): string
    {
        $firstParticipant = trim(explode('||', $rawValue)[0] ?? '');
        $name = trim(explode('|', $firstParticipant)[0] ?? $firstParticipant);

        return $name !== '' ? $name : trim($rawValue);
    }

    private function formatChecklistCurrency(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '-';
        }

        return 'R$ ' . number_format((float) $value, 2, ',', '.');
    }

    private function syncCaseTagCatalog(mixed $tags): void
    {
        CaseTag::upsertFromCaseTags($tags);
    }

    private function resolveAgreementClosedAtPayload(array $payload, ?LegalCase $existingCase = null): array
    {
        if (array_key_exists('agreement_closed_at', $payload)) {
            return [
                'agreement_closed_at' => $this->normalizeAgreementClosedAtValue($payload['agreement_closed_at']),
            ];
        }

        $resolvedStatus = $payload['status'] ?? $existingCase?->status;
        if (!in_array($resolvedStatus, LegalCase::AGREEMENT_METRIC_STATUSES, true)) {
            return [];
        }

        if ($existingCase?->agreement_closed_at) {
            return [
                'agreement_closed_at' => $existingCase->agreement_closed_at instanceof Carbon
                    ? $existingCase->agreement_closed_at->toDateString()
                    : (string) $existingCase->agreement_closed_at,
            ];
        }

        return [
            'agreement_closed_at' => now()->toDateString(),
        ];
    }

    private function normalizeAgreementClosedAtValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalizedValue = trim((string) $value);
        if ($normalizedValue === '') {
            return null;
        }

        return Carbon::parse($normalizedValue)->toDateString();
    }

    private function applyResponsibleFilter($query, Request $request, User $user): void
    {
        if ($user->role === 'operador') {
            $query->where('user_id', $user->id);
            return;
        }

        $responsibleFilter = $this->resolveResponsibleFilter($request);

        if (! $responsibleFilter['has_filter']) {
            return;
        }

        $query->where(function ($responsibleQuery) use ($responsibleFilter) {
            if (count($responsibleFilter['ids']) > 0) {
                $responsibleQuery->whereIn('user_id', $responsibleFilter['ids']);
            }

            if ($responsibleFilter['include_unassigned']) {
                if (count($responsibleFilter['ids']) > 0) {
                    $responsibleQuery->orWhereNull('user_id');
                } else {
                    $responsibleQuery->whereNull('user_id');
                }
            }
        });
    }

    private function resolveResponsibleFilter(Request $request): array
    {
        $rawValues = [];

        if ($request->has('lawyer_ids')) {
            $rawValues = Arr::wrap($request->input('lawyer_ids'));
        } elseif ($request->has('lawyer_ids[]')) {
            $rawValues = Arr::wrap($request->input('lawyer_ids[]'));
        } elseif ($request->filled('lawyer_id')) {
            $rawValues = [$request->input('lawyer_id')];
        }

        $ids = [];
        $includeUnassigned = false;

        foreach (Arr::flatten($rawValues) as $rawValue) {
            foreach (explode(',', (string) $rawValue) as $value) {
                $normalizedValue = trim($value);

                if ($normalizedValue === '') {
                    continue;
                }

                if ($normalizedValue === self::UNASSIGNED_RESPONSIBLE_VALUE) {
                    $includeUnassigned = true;
                    continue;
                }

                if (ctype_digit($normalizedValue)) {
                    $ids[] = (int) $normalizedValue;
                }
            }
        }

        $ids = array_values(array_unique(array_filter($ids, fn (int $id) => $id > 0)));

        return [
            'ids' => $ids,
            'include_unassigned' => $includeUnassigned,
            'has_filter' => $includeUnassigned || count($ids) > 0,
        ];
    }

    private function legalCasesTableHasIndicatorUserId(): bool
    {
        static $hasIndicatorUserIdColumn = null;

        if ($hasIndicatorUserIdColumn !== null) {
            return $hasIndicatorUserIdColumn;
        }

        try {
            $hasIndicatorUserIdColumn = Schema::hasColumn('legal_cases', 'indicator_user_id');
        } catch (\Throwable $exception) {
            Log::warning('Nao foi possivel verificar a coluna indicator_user_id em legal_cases.', [
                'error' => $exception->getMessage(),
            ]);
            $hasIndicatorUserIdColumn = false;
        }

        return $hasIndicatorUserIdColumn;
    }

    private function applyContraIndicationPayload(array $data, ?LegalCase $case = null): array
    {
        $currentStatus = $case?->status;
        $targetStatus = $data['status'] ?? $currentStatus;

        if ($targetStatus === LegalCase::STATUS_CONTRA_INDICATED) {
            $reasonId = $data['contra_indication_reason_id'] ?? $case?->contra_indication_reason_id ?? null;
            $reasonText = trim((string) ($data['contra_indication_reason'] ?? $case?->contra_indication_reason ?? ''));

            if (empty($reasonId) && $reasonText === '') {
                throw ValidationException::withMessages([
                    'contra_indication_reason_id' => 'Selecione o motivo da contraindicação.',
                ]);
            }

            $data['contra_indication_reason_id'] = $reasonId;
            $data['contra_indication_reason'] = $reasonText !== '' ? $reasonText : null;

            if ($currentStatus !== LegalCase::STATUS_CONTRA_INDICATED || empty($case?->contra_indicated_at)) {
                $data['contra_indicated_at'] = now();
                $data['contra_indicated_by_user_id'] = Auth::id();
            }

            return $data;
        }

        if (
            $targetStatus !== LegalCase::STATUS_CONTRA_INDICATED
            && (array_key_exists('status', $data) || array_key_exists('contra_indication_reason', $data))
        ) {
            $data['contra_indication_reason'] = null;
            $data['contra_indication_reason_id'] = null;
        }

        if (
            array_key_exists('status', $data)
            && $targetStatus !== LegalCase::STATUS_CONTRA_INDICATED
        ) {
            $data['contra_indicated_at'] = null;
            $data['contra_indicated_by_user_id'] = null;
        }

        return $data;
    }

    private function applyFailedDealPayload(array $data, ?LegalCase $case = null): array
    {
        $currentStatus = $case?->status;
        $targetStatus = $data['status'] ?? $currentStatus;

        if ($targetStatus === LegalCase::STATUS_FAILED_DEAL) {
            $reasonId = $data['failed_deal_reason_id'] ?? $case?->failed_deal_reason_id ?? null;
            $reasonText = trim((string) ($data['failed_deal_reason'] ?? $case?->failed_deal_reason ?? ''));

            if (empty($reasonId) && $reasonText === '') {
                throw ValidationException::withMessages([
                    'failed_deal_reason_id' => 'Selecione o motivo do acordo frustrado.',
                ]);
            }

            $data['failed_deal_reason_id'] = $reasonId;
            $data['failed_deal_reason'] = $reasonText !== '' ? $reasonText : null;

            if ($currentStatus !== LegalCase::STATUS_FAILED_DEAL || empty($case?->failed_deal_at)) {
                $data['failed_deal_at'] = now();
                $data['failed_deal_by_user_id'] = Auth::id();
            }

            return $data;
        }

        if (
            $targetStatus !== LegalCase::STATUS_FAILED_DEAL
            && (array_key_exists('status', $data) || array_key_exists('failed_deal_reason', $data))
        ) {
            $data['failed_deal_reason'] = null;
            $data['failed_deal_reason_id'] = null;
        }

        if (
            array_key_exists('status', $data)
            && $targetStatus !== LegalCase::STATUS_FAILED_DEAL
        ) {
            $data['failed_deal_at'] = null;
            $data['failed_deal_by_user_id'] = null;
        }

        return $data;
    }

    private function caseRelationshipLoads(array $extraRelationships = []): array
    {
        $relationships = [
            'client',
            'lawyer',
            'opposingLawyer',
            'plaintiff',
            'defendantRel',
            'actionObject',
            'contraIndicatedBy',
            'contraIndicationReasonRef',
            'failedDealReasonRef',
            'failedDealBy',
            'reanalysisReasonRef',
            'reanalysisRequestedBy',
        ];

        if ($this->legalCasesTableHasIndicatorUserId()) {
            $relationships[] = 'indicator';
        }

        $relationships[] = 'legalOpinionAttachment';

        return array_values(array_unique(array_merge($relationships, $extraRelationships)));
    }

    private function formatBlockingReasons(array $blockingReasons): string
    {
        $reasons = array_values(array_filter($blockingReasons, static fn ($reason) => is_string($reason) && trim($reason) !== ''));
        $count = count($reasons);

        if ($count === 0) {
            return 'existem restricoes impeditivas';
        }

        if ($count === 1) {
            return $reasons[0];
        }

        if ($count === 2) {
            return $reasons[0] . ' e ' . $reasons[1];
        }

        $lastReason = array_pop($reasons);

        return implode(', ', $reasons) . ' e ' . $lastReason;
    }
}
