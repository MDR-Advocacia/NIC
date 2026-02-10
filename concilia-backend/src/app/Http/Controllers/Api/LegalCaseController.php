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
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log; 
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
        $query = LegalCase::with(['client', 'lawyer', 'opposingLawyer', 'plaintiff', 'defendantRel']);

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

        // 1. Detectar se é OUROCAP (Banco do Brasil)
        $isOurocap = false;
        if (str_contains(mb_strtolower($case->description ?? ''), 'ourocap')) {
            $isOurocap = true;
        }

        // 2. Detectar se é LIVELO
        $isLivelo = false;
        if ($case->client && str_contains(mb_strtolower($case->client->name), 'livelo')) {
            $isLivelo = true;
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
        // Conversão de lawyer_id para user_id (Lógica Original Mantida)
        if ($request->has('lawyer_id')) {
            $request->merge(['user_id' => $request->input('lawyer_id')]);
        }

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
            'description' => 'nullable|string',
            'status' => 'required|string',
            'priority' => 'required|string',
            'original_value' => 'required|numeric',
            'agreement_value' => 'nullable|numeric',
            'cause_value' => 'nullable|numeric',
            
            'opposing_lawyer' => 'nullable|string', // Nome visual
            'opposing_contact' => 'nullable|string',
            
            'comarca' => 'nullable|string',
            'state' => 'nullable|string',
            'city' => 'nullable|string',
            'special_court' => 'nullable|string',
            
            'tags' => 'nullable|array',
            'agreement_probability' => 'nullable|numeric|min:0|max:100',
            'pcond_probability' => 'nullable|numeric',
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
        // Carrega todos os relacionamentos para exibição completa
        return response()->json($case->load([
            'client', 
            'lawyer', 
            'opposingLawyer', 
            'plaintiff', 
            'defendantRel', 
            'histories', 
            'histories.user'
        ]));
    }

    /**
     * Atualiza um caso existente.
     */
    public function update(Request $request, LegalCase $case): JsonResponse
    {
        $this->authorize('update', $case);

        // Compatibilidade com frontend antigo
        if ($request->has('lawyer_id')) {
            $request->merge(['user_id' => $request->input('lawyer_id')]);
        }

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
            'description' => 'nullable|string',
            'status' => 'sometimes|required|string',
            'priority' => 'sometimes|required|string',
            'original_value' => 'sometimes|required|numeric',
            'agreement_value' => 'nullable|numeric',
            'cause_value' => 'nullable|numeric',
            
            'comarca' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:2',
            'city' => 'nullable|string|max:255',
            'special_court' => 'nullable|string',
            
            'opposing_lawyer' => 'nullable|string|max:255',
            'opposing_contact' => 'nullable|string|max:255',
            
            'tags' => 'nullable|array',
            'agreement_probability' => 'nullable|numeric|min:0|max:100',
            'pcond_probability' => 'nullable|numeric',
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

        return response()->json($case->fresh(['client', 'lawyer', 'opposingLawyer', 'plaintiff', 'defendantRel']));
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
        $query = LegalCase::with(['client', 'lawyer']);

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
                $row['Advogado Responsavel'] = $case->lawyer->name ?? 'N/A';
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
            'updated_condemnation_value' => 'Condenação Atualizada',
            'pcond_probability' => 'Probabilidade de Condenação',
            'priority' => 'Prioridade',
            'description' => 'Observações',
            'opposing_lawyer' => 'Advogado Adverso',
        ];

        DB::beginTransaction();

        try {
            foreach ($casesToImport as $index => $caseData) {
                
                // 1. Sanitização e FORMATAÇÃO do Número do Processo (CNJ)
                if (isset($caseData['case_number'])) {
                    $cleanNumber = preg_replace('/\D/', '', $caseData['case_number']); // Remove tudo
                    
                    // Se tiver 20 dígitos, reaplica a máscara padrão CNJ: 0000000-00.2000.0.00.0000
                    if (strlen($cleanNumber) === 20) {
                        $caseData['case_number'] = preg_replace(
                            "/(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/",
                            "\$1-\$2.\$3.\$4.\$5.\$6",
                            $cleanNumber
                        );
                    } else {
                        // Se não tiver 20 digitos, mantém só os números para salvar (melhor que nada)
                        $caseData['case_number'] = $cleanNumber;
                    }
                }

                // 2. Sanitização INTELIGENTE de Dinheiro (PT-BR e US)
                $moneyFields = ['cause_value', 'original_value', 'agreement_value', 'updated_condemnation_value', 'pcond_probability'];
                foreach ($moneyFields as $field) {
                    if (isset($caseData[$field])) {
                        $val = $caseData[$field];
                        // Se for string, tenta limpar
                        if (is_string($val)) {
                            // Se tiver vírgula, assumimos padrão BR (ex: 1.200,50 ou 10,00)
                            if (strpos($val, ',') !== false) {
                                $val = str_replace('.', '', $val); // Remove milhar (1.200 -> 1200)
                                $val = str_replace(',', '.', $val); // Troca decimal (1200,50 -> 1200.50)
                            } 
                            // Remove R$ e espaços
                            $val = preg_replace('/[^\d.]/', '', $val);
                        }
                        // Se ficou vazio, define null temporariamente
                        $caseData[$field] = ($val === '' || $val === null) ? null : $val;
                    }
                }

                // 3. Preenchimento de VALORES PADRÃO (Evita erro "Column cannot be null")
                if (empty($caseData['original_value'])) {
                    $caseData['original_value'] = 0; // Default seguro
                }
                if (empty($caseData['cause_value'])) {
                    $caseData['cause_value'] = 0;
                }
                if (empty($caseData['agreement_value'])) {
                    $caseData['agreement_value'] = 0;
                }

                // 4. Resolver Advogado
                if (isset($caseData['lawyer_name']) && !empty($caseData['lawyer_name'])) {
                    $lawyer = \App\Models\User::where('name', 'LIKE', '%' . trim($caseData['lawyer_name']) . '%')->first();
                    if ($lawyer) $caseData['user_id'] = $lawyer->id;
                }
                if (!isset($caseData['user_id']) && isset($caseData['lawyer_id'])) {
                    $caseData['user_id'] = $caseData['lawyer_id'];
                }

                // Limpeza geral
                foreach ($caseData as $key => $value) {
                    if ($value === '' || $value === null) $caseData[$key] = null;
                }

                // 5. Validação
                $validator = Validator::make($caseData, [
                    'case_number' => 'required|string|max:255',
                    'opposing_party' => 'required|string|max:255',
                    'defendant' => 'required|string|max:255',
                    'user_id' => 'required|exists:users,id',
                    'action_object' => 'required|string|max:255',
                    'internal_number' => 'nullable|numeric', 
                    'start_date' => 'nullable', 
                    'comarca' => 'nullable|string|max:255',
                    'city' => 'nullable|string|max:255',
                    'state' => 'nullable|string|max:2',
                    'special_court' => 'nullable|string',
                    'cause_value' => 'nullable|numeric',
                    'original_value' => 'required|numeric', 
                    'agreement_value' => 'nullable|numeric',
                    'updated_condemnation_value' => 'nullable|numeric',
                    'pcond_probability' => 'nullable|numeric',
                    'priority' => 'nullable|string',
                    'description' => 'nullable|string',
                    'opposing_lawyer' => 'nullable|string',
                    'opposing_contact' => 'nullable|string',
                ], $messages, $customAttributes);

                if ($validator->fails()) {
                    $errors[] = [
                        'line' => "Registro " . ($index + 1), 
                        'errors' => $validator->errors()->all()
                    ];
                } else {
                    
                    // Checagem de Duplicidade
                    if (LegalCase::where('case_number', $caseData['case_number'])->exists()) {
                         $errors[] = [
                            'line' => "Registro " . ($index + 1), 
                            'errors' => ["O Número do Processo '{$caseData['case_number']}' já existe."]
                        ];
                        continue;
                    }

                    $caseData['client_id'] = $clientId;
                    $caseData['status'] = 'initial_analysis';
                    $caseData['priority'] = !empty($caseData['priority']) ? strtolower($caseData['priority']) : 'media';
                    
                    if (isset($caseData['special_court'])) {
                        $sc = strtolower($caseData['special_court']);
                        $caseData['special_court'] = ($sc == 's' || $sc == 'sim' || $sc == 'yes') ? 'Sim' : 'Não';
                    } else {
                        $caseData['special_court'] = 'Não';
                    }

                    if (!empty($caseData['start_date'])) {
                        try {
                            $date = \Carbon\Carbon::createFromFormat('d/m/Y', $caseData['start_date']);
                            $caseData['start_date'] = $date ? $date->format('Y-m-d') : null;
                        } catch (\Exception $e) {}
                    }

                    // --- FIND OR CREATE RELACIONAMENTOS ---
                    if (!empty($caseData['opposing_party'])) {
                        $plaintiff = Plaintiff::firstOrCreate(['name' => trim($caseData['opposing_party'])]);
                        $caseData['plaintiff_id'] = $plaintiff->id;
                    }
                    if (!empty($caseData['defendant'])) {
                        $defendant = Defendant::firstOrCreate(['name' => trim($caseData['defendant'])]);
                        $caseData['defendant_id'] = $defendant->id;
                    }
                    if (!empty($caseData['opposing_lawyer'])) {
                        $opLawyer = OpposingLawyer::firstOrCreate(['name' => trim($caseData['opposing_lawyer'])]);
                        $caseData['opposing_lawyer_id'] = $opLawyer->id;
                    }

                    // 6. TENTATIVA DE SALVAR COM CAPTURA DE ERRO DE BANCO
                    try {
                        LegalCase::create($caseData);
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
                    'errors' => $errors,
                ], 422);
            }

            DB::commit();
            return response()->json([
                'message' => "Importação concluída! $successCount casos criados.",
                'success_count' => $successCount,
                'errors' => [],
            ], 201);

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
}