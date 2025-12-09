<?php

namespace App\Http\Controllers\Api;

use App\Services\AuditService;
use App\Http\Controllers\Controller;
use App\Models\LegalCase;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Barryvdh\DomPDF\Facade\Pdf;

class LegalCaseController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of the resource.
     * ATUALIZADO COM LÓGICA DE PERMISSÃO (RBAC) E FILTROS
     */
    public function index(Request $request): JsonResponse
    {
        AuditService::log('view_pipeline', 'O usuário acessou o pipeline de acordos.');
        $user = Auth::user();
        
        // Começa a query base, sempre com os relacionamentos
        // Mantemos 'lawyer' no with() pois é o nome da função no Model
        $query = LegalCase::with(['client', 'lawyer']);

        // --- LÓGICA DE PERMISSÃO (RBAC) ---
        // Se for OPERADOR, força a ver apenas seus casos (usando user_id)
        if ($user->role === 'operador') {
            $query->where('user_id', $user->id); // <--- CORRIGIDO: lawyer_id para user_id
        } 
        // Se for ADMIN ou SUPERVISOR, vê tudo (e pode usar filtro se quiser)
        else {
            // Só aplica filtro de advogado se foi solicitado na busca
            // (O front ainda pode mandar 'lawyer_id' como filtro, mas buscamos na coluna 'user_id')
            if ($request->has('lawyer_id') && $request->input('lawyer_id') != '') {
                $query->where('user_id', $request->input('lawyer_id')); // <--- CORRIGIDO
            }
        }
        // --- FIM DA LÓGICA DE PERMISSÃO ---

        // Filtro de busca por termo (case_number ou opposing_party)
        if ($request->has('search') && $request->input('search') != '') {
            $searchTerm = $request->input('search');
            $query->where(function ($q) use ($searchTerm) {
                $q->where('case_number', 'like', "%{$searchTerm}%")
                    ->orWhere('opposing_party', 'like', "%{$searchTerm}%");
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

        // Retorna os resultados ordenados pelos mais recentes
        return response()->json($query->latest()->get());
    }

    /**
     * Gera a minuta de acordo em PDF.
     */
    public function generateAgreement($id)
    {
        $case = LegalCase::with('client')->findOrFail($id);

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

    public function store(Request $request): JsonResponse
    {
        // Se o frontend enviar 'lawyer_id', nós o convertemos para 'user_id' antes de validar
        if ($request->has('lawyer_id')) {
            $request->merge(['user_id' => $request->input('lawyer_id')]);
        }

        $validatedData = $request->validate([
            'case_number' => 'required|string|max:255',
            'start_date' => 'nullable|date',
            'client_id' => 'required|exists:clients,id',
            'user_id' => 'required|exists:users,id', // <--- CORRIGIDO: Valida user_id
            'opposing_party' => 'required|string|max:255',
            'defendant' => 'required|string|max:255',
            'action_object' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|string',
            'priority' => 'required|string',
            'original_value' => 'required|numeric',
            'agreement_value' => 'nullable|numeric',
            'cause_value' => 'nullable|numeric',
            'tags' => 'nullable|array',
            'agreement_probability' => 'nullable|numeric|min:0|max:100',
            'agreement_checklist_data' => 'nullable|array',
        ]);

        $case = LegalCase::create($validatedData);
        return response()->json($case, 201);
    }

    public function show(LegalCase $case): JsonResponse
    {
        $this->authorize('view', $case);
        return response()->json($case->load('client', 'lawyer', 'histories', 'histories.user'));
    }

    public function update(Request $request, LegalCase $case): JsonResponse
    {
        $this->authorize('update', $case);

        // Compatibilidade com frontend antigo
        if ($request->has('lawyer_id')) {
            $request->merge(['user_id' => $request->input('lawyer_id')]);
        }

        $validatedData = $request->validate([
            'case_number' => 'sometimes|required|string|max:255',
            'start_date' => 'nullable|date',
            'client_id' => 'sometimes|required|exists:clients,id',
            'user_id' => 'sometimes|required|exists:users,id', // <--- CORRIGIDO
            'opposing_party' => 'sometimes|required|string|max:255',
            'defendant' => 'sometimes|required|string|max:255',
            'action_object' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|required|string|in:initial_analysis,proposal_sent,in_negotiation,awaiting_draft,closed_deal,failed_deal',
            'priority' => 'sometimes|required|string|in:baixa,media,alta',
            'original_value' => 'sometimes|required|numeric',
            'agreement_value' => 'nullable|numeric',
            'cause_value' => 'nullable|numeric',
            'comarca' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:2',
            'opposing_lawyer' => 'nullable|string|max:255',
            'opposing_contact' => 'nullable|string|max:255',
            'tags' => 'nullable|array',
            'agreement_probability' => 'nullable|numeric|min:0|max:100',
            'agreement_checklist_data' => 'nullable|array',
        ]);

        $originalData = $case->getOriginal();
        $case->update($validatedData);
        $changes = $case->getChanges();

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
        return response()->json($case->fresh(['client', 'lawyer']));
    }

    public function destroy(LegalCase $case): JsonResponse
    {
        $this->authorize('delete', $case);
        $case->delete();
        return response()->json(null, 204);
    }

    public function export(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $fileName = 'casos_concilia_' . date('Y-m-d') . '.csv';

        $user = Auth::user();
        $query = LegalCase::with(['client', 'lawyer']);

        // --- LÓGICA DE PERMISSÃO ---
        if ($user->role === 'operador') {
            $query->where('user_id', $user->id); // <--- CORRIGIDO
        } 
        elseif ($request->has('lawyer_id') && $request->input('lawyer_id') != '') {
            $query->where('user_id', $request->input('lawyer_id')); // <--- CORRIGIDO
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

        // Mensagens de erro personalizadas em Português
        $messages = [
            'required' => 'O campo :attribute é obrigatório.',
            'exists' => 'O :attribute informado não foi encontrado no sistema.',
            'date' => 'O campo :attribute deve ser uma data válida.',
            'numeric' => 'O campo :attribute deve ser um número válido.',
            'string' => 'O campo :attribute deve ser um texto.',
            'max' => 'O campo :attribute é muito longo.',
            'in' => 'O valor informado para :attribute é inválido.',
        ];

        // Nomes amigáveis para os campos (para não aparecer "case_number" no erro)
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
        ];

        DB::beginTransaction();

        try {
            foreach ($casesToImport as $index => $caseData) {
                
                // 1. Buscar Advogado Responsável pelo NOME
                if (isset($caseData['lawyer_name']) && !empty($caseData['lawyer_name'])) {
                    // Busca por nome exato ou aproximado
                    $lawyer = \App\Models\User::where('name', 'LIKE', '%' . trim($caseData['lawyer_name']) . '%')->first();
                    if ($lawyer) {
                        $caseData['user_id'] = $lawyer->id;
                    }
                }
                
                // Fallback: Se não achou por nome, mas veio ID (caso raro)
                if (!isset($caseData['user_id']) && isset($caseData['lawyer_id'])) {
                    $caseData['user_id'] = $caseData['lawyer_id'];
                }

                // Limpeza de campos vazios (string vazia "" vira null)
                foreach ($caseData as $key => $value) {
                    if ($value === '' || $value === null) {
                        $caseData[$key] = null;
                    }
                }

                // 2. Validação Rigorosa conforme pedido (Campos com *)
                $validator = Validator::make($caseData, [
                    // Obrigatórios (*)
                    'case_number' => 'required|string|max:255',
                    'action_object' => 'required|string|max:255',
                    'opposing_party' => 'required|string|max:255', // Autor
                    'defendant' => 'required|string|max:255',      // Réu
                    'user_id' => 'required|exists:users,id',       // Advogado Responsável

                    // Opcionais
                    'internal_number' => 'nullable|numeric', // "precisa ser número"
                    'start_date' => 'nullable', 
                    
                    'comarca' => 'nullable|string|max:255',
                    'city' => 'nullable|string|max:255',
                    'state' => 'nullable|string|max:2',
                    'special_court' => 'nullable|string',
                    
                    'cause_value' => 'nullable|numeric',
                    'original_value' => 'nullable|numeric',
                    'agreement_value' => 'nullable|numeric',
                    'updated_condemnation_value' => 'nullable|numeric',
                    'pcond_probability' => 'nullable|numeric',
                    
                    'priority' => 'nullable|string',
                    'description' => 'nullable|string',
                    // Outros campos visuais que não validamos no backend mas podem vir
                    'opposing_lawyer' => 'nullable|string',
                    'opposing_contact' => 'nullable|string',
                ], $messages, $customAttributes);

                if ($validator->fails()) {
                    // Erro formatado: "Registro 3: O campo Número do Processo é obrigatório."
                    $errors[] = [
                        'line' => "Registro " . ($index + 1), 
                        'errors' => $validator->errors()->all()
                    ];
                } else {
                    $caseData['client_id'] = $clientId;
                    // Defaults
                    $caseData['status'] = 'initial_analysis';
                    $caseData['priority'] = !empty($caseData['priority']) ? strtolower($caseData['priority']) : 'media';
                    
                    // Tratamento especial para Juizado Especial (S/N -> Sim/Não)
                    if (isset($caseData['special_court'])) {
                        $sc = strtolower($caseData['special_court']);
                        $caseData['special_court'] = ($sc == 's' || $sc == 'sim' || $sc == 'yes') ? 'Sim' : 'Não';
                    } else {
                        $caseData['special_court'] = 'Não';
                    }

                    // Tratamento de Data (se vier d/m/Y converter para Y-m-d)
                    if (!empty($caseData['start_date'])) {
                        try {
                            $date = \Carbon\Carbon::createFromFormat('d/m/Y', $caseData['start_date']);
                            $caseData['start_date'] = $date ? $date->format('Y-m-d') : null;
                        } catch (\Exception $e) { }
                    }

                    LegalCase::create($caseData);
                    $successCount++;
                }
            }

            if (!empty($errors)) {
                DB::rollBack();
                return response()->json([
                    'message' => 'A importação falhou. Verifique os erros abaixo.',
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
            return response()->json(['message' => 'Erro interno.', 'error' => $e->getMessage()], 500);
        }
    }
}