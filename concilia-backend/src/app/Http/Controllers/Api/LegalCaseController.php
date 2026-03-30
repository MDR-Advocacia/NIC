<?php

namespace App\Http\Controllers\Api;

use App\Services\AuditService;
use App\Http\Controllers\Controller;
use App\Models\LegalCase;
use App\Models\User;
use App\Models\AuditLog;
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
use Barryvdh\DomPDF\Facade\Pdf;

class LegalCaseController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            AuditService::log('view_pipeline', 'O usuário acessou o pipeline de acordos.');
        } catch (\Exception $e) {}
        
        $user = Auth::user();
        
        // Começa a query base, carregando todos os relacionamentos importantes
        $query = LegalCase::with($this->caseRelationshipLoads());

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
            $query->where('status', LegalCase::STATUS_INITIAL_ANALYSIS);
        }

        // --- LÓGICA DE PERMISSÃO (RBAC) ---
        if ($user->role === 'operador') {
            $query->where('user_id', $user->id);
        } 
        else {
            if ($request->has('lawyer_id') && $request->input('lawyer_id') != '') {
                $query->where('user_id', $request->input('lawyer_id'));
            }
        }

        // Filtro de busca por termo
        if ($request->has('search') && $request->input('search') != '') {
            $searchTerm = $request->input('search');
            $query->where(function ($q) use ($searchTerm) {
                $q->where('case_number', 'like', "%{$searchTerm}%")
                    ->orWhere('opposing_party', 'like', "%{$searchTerm}%") // Busca legado (texto)
                    ->orWhereHas('plaintiff', function($q2) use ($searchTerm) { // Busca na tabela de Autores
                        $q2->where('name', 'like', "%{$searchTerm}%");
                    })
                    ->orWhereHas('defendantRel', function($q3) use ($searchTerm) { // Busca na tabela de Réus
                        $q3->where('name', 'like', "%{$searchTerm}%");
                    });
            });
        }

        // Filtro por Status
        if ($request->has('status') && $request->input('status') != '') {
            $query->where('status', $request->input('status'));
        }

        // Filtro por Prioridade
        if ($request->has('priority') && $request->input('priority') != '') {
            $query->where('priority', $request->input('priority'));
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

        // Retorna os resultados paginados
        return response()->json($query->paginate($perPage));
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

        $validatedData = $request->validate([
            'case_number' => 'required|string|max:255',
            'start_date' => 'nullable|date',
            'client_id' => 'required|exists:clients,id',
            'user_id' => 'required|exists:users,id',
            
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
            'priority' => 'required|string',
            'original_value' => 'required|numeric',
            'agreement_value' => 'nullable|numeric',
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
            'agreement_probability' => 'nullable|numeric|min:0|max:100',
            'pcond_probability' => 'nullable|numeric|min:0',
            'updated_condemnation_value' => 'nullable|numeric',
            'agreement_checklist_data' => 'nullable|array',
        ]);

        $case = LegalCase::create($validatedData);

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

        if (Auth::user()?->role === 'indicador' && $case->status !== LegalCase::STATUS_INITIAL_ANALYSIS) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

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

        // Salva o status ANTIGO para o log de auditoria
        $oldStatus = $case->status;

        $validatedData = $request->validate([
            'case_number' => 'sometimes|required|string|max:255',
            'start_date' => 'nullable|date',
            'client_id' => 'sometimes|required|exists:clients,id',
            'user_id' => 'sometimes|required|exists:users,id',
            
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
            'priority' => 'sometimes|required|string',
            'original_value' => 'sometimes|required|numeric',
            'agreement_value' => 'nullable|numeric',
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
            'agreement_probability' => 'nullable|numeric|min:0|max:100',
            'pcond_probability' => 'nullable|numeric|min:0',
            'updated_condemnation_value' => 'nullable|numeric',
            'agreement_checklist_data' => 'nullable|array',
        ]);

        $originalData = $case->getOriginal();
        $case->update($validatedData);
        $changes = $case->getChanges();

        // --- SISTEMA DE HISTÓRICO INTERNO DO CASO (Lógica Original Mantida) ---
        if (!empty($changes)) {
            unset($changes['updated_at']);
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
            'materia.notes' => 'nullable|string|max:1000',
            'obrigacao.type' => 'required|string|in:simples,complexa,apenas_pecuniaria',
            'subsidio.available' => 'required|string|in:sim,nao',
            'analise_subsidio.notes' => 'required|string|max:4000',
            'litigante_habitual.notes' => 'nullable|string|max:1000',
            'analise_risco.last_analysis_date' => 'required|date',
            'pcond_portal.value' => 'required|string|max:255',
            'pcond_processual.value' => 'required|string|max:1000',
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
            'status' => LegalCase::STATUS_IN_NEGOTIATION,
            'user_id' => $responsibleOperator->id,
            'agreement_checklist_data' => $existingChecklistData,
        ];

        if ($supportsIndicatorUserId) {
            $caseUpdatePayload['indicator_user_id'] = $user->id;
        }

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
                'status' => LegalCase::STATUS_IN_NEGOTIATION,
                'user_id' => $responsibleOperator->id,
                'indicator_user_id' => $user->id,
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
        $query = LegalCase::with($this->caseRelationshipLoads(['client', 'lawyer']));

        // --- FILTRO POR SCOPE (ALÇADA) ---
        $scope = $request->input('scope', 'pipeline');
        if ($scope === 'pipeline') {
            $query->where('has_alcada', true);
        } elseif ($scope === 'general_base') {
            $query->where('has_alcada', false);
        }

        // --- LÓGICA DE PERMISSÃO (Mantida) ---
        if ($user->role === 'operador') {
            $query->where('user_id', $user->id); 
        } 
        elseif ($request->has('lawyer_id') && $request->input('lawyer_id') != '') {
            $query->where('user_id', $request->input('lawyer_id')); 
        }

        if ($request->has('search') && $request->input('search') != '') {
            $searchTerm = $request->input('search');
            $query->where(function ($q) use ($searchTerm) {
                $q->where('case_number', 'like', "%{$searchTerm}%")
                    ->orWhere('opposing_party', 'like', "%{$searchTerm}%");
            });
        }
        if ($request->has('status') && $request->input('status') != '') {
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
            'action_object' => 'Objeto da Ação',
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
                if (empty($caseData['cause_value'])) {
                    $caseData['cause_value'] = $caseData['original_value'] ?? 0;
                }
                $caseData['has_alcada'] = $this->resolveImportedHasAlcada(
                    $caseData['original_value'] ?? null,
                    $existingCase
                );

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
        ]);

        $caseIds = $validated['case_ids'];
        $action = $validated['action'];
        $value = $validated['value'];

        DB::beginTransaction();
        try {
            $query = LegalCase::whereIn('id', $caseIds);
            $count = $query->count();
            $logDetails = "";

            switch ($action) {
                case 'update_status':
                    // Assume que o frontend envia o enum correto
                    $query->update(['status' => $value]);
                    $logDetails = "Alterou status de {$count} processos para '{$value}'";
                    break;

                case 'update_priority':
                    $query->update(['priority' => $value]);
                    $logDetails = "Alterou prioridade de {$count} processos para '{$value}'";
                    break;

                case 'transfer_user':
                    // $value é o user_id do novo responsável
                    $query->update(['user_id' => $value]);
                    $newOwner = User::find($value);
                    $ownerName = $newOwner ? $newOwner->name : 'ID ' . $value;
                    $logDetails = "Transferiu {$count} processos para {$ownerName}";
                    break;
                
                case 'update_opposing_lawyer':
                    $query->update(['opposing_lawyer_id' => $value]);
                    $logDetails = "Vinculou advogado adverso (ID {$value}) em {$count} processos";
                    break;

                case 'add_tag':
                    // Loop para manipular JSON com segurança
                    $cases = $query->get();
                    foreach($cases as $case) {
                        $currentTags = $case->tags ?? [];
                        if (!in_array($value, $currentTags)) {
                            $currentTags[] = $value;
                            $case->update(['tags' => $currentTags]);
                        }
                    }
                    $logDetails = "Adicionou a tag '{$value}' em {$count} processos";
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
            'comarca' => 255,
            'city' => 255,
            'state' => 2,
            'opposing_lawyer' => 255,
            'internal_number' => 255,
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

            $matchedUser = User::query()->find((int) $candidateId);
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
            ->orderBy('id')
            ->get(['id', 'name', 'status']);

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

    private function caseRelationshipLoads(array $extraRelationships = []): array
    {
        $relationships = [
            'client',
            'lawyer',
            'opposingLawyer',
            'plaintiff',
            'defendantRel',
            'actionObject',
        ];

        if ($this->legalCasesTableHasIndicatorUserId()) {
            $relationships[] = 'indicator';
        }

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
