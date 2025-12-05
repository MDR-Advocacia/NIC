<?php

namespace App\Http\Controllers\Api;

use App\Services\AuditService;
use App\Http\Controllers\Controller;
use App\Models\LegalCase;
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

    public function index(Request $request): JsonResponse
    {
        AuditService::log('view_pipeline', 'O usuário acessou o pipeline de acordos.');
        $user = Auth::user();
        
        $query = LegalCase::with(['client', 'lawyer']);

        if ($user->role === 'operador') {
            $query->where('user_id', $user->id); 
        } 
        else {
            if ($request->has('lawyer_id') && $request->input('lawyer_id') != '') {
                $query->where('user_id', $request->input('lawyer_id'));
            }
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

        return response()->json($query->latest()->get());
    }

    public function generateAgreement($id)
    {
        $case = LegalCase::with('client')->findOrFail($id);

        $isOurocap = false;
        if (str_contains(mb_strtolower($case->description ?? ''), 'ourocap')) {
            $isOurocap = true;
        }

        $isLivelo = false;
        if ($case->client && str_contains(mb_strtolower($case->client->name), 'livelo')) {
            $isLivelo = true;
        }

        $hasObligation = !empty($case->obligation_description); 

        if ($isOurocap) {
            $viewName = 'documents.minuta_ourocap';
        } elseif ($isLivelo) {
            $viewName = 'documents.minuta_livelo';
        } elseif ($hasObligation) {
            $viewName = 'documents.minuta_com_obrigacao';
        } else {
            $viewName = 'documents.minuta_padrao_sem_obrigacao'; 
        }

        $pdf = Pdf::loadView($viewName, ['case' => $case]);

        return $pdf->download('minuta_acordo_' . $case->case_number . '.pdf');
    }

    public function store(Request $request): JsonResponse
    {
        if ($request->has('lawyer_id')) {
            $request->merge(['user_id' => $request->input('lawyer_id')]);
        }

        // --- MENSAGENS PERSONALIZADAS ---
        $messages = [
            'case_number.required' => 'O número do processo é obrigatório.',
            'case_number.unique' => 'Este número de processo já está cadastrado.',
            'case_number.regex' => 'O formato deve ser NNNNNNN-DD.AAAA.J.TR.OOOO (Padrão CNJ).',
            'client_id.required' => 'O campo Cliente é obrigatório.',
            'client_id.exists' => 'O cliente selecionado é inválido.',
            'user_id.exists' => 'O advogado selecionado é inválido.',
            'opposing_party.required' => 'O nome do Autor é obrigatório.',
            'defendant.required' => 'O nome do Réu é obrigatório.',
            'original_value.required' => 'O valor de alçada é obrigatório.'
        ];

        // --- VALIDAÇÃO COM REGEX E UNIQUE ---
        $validatedData = $request->validate([
            'case_number' => [
                'required',
                'string',
                'max:255',
                'unique:legal_cases,case_number', // Garante unicidade
                'regex:/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/' // Garante formato CNJ
            ],
            'start_date' => 'nullable|date',
            'client_id' => 'required|exists:clients,id',
            'user_id' => 'nullable|exists:users,id', 
            'opposing_party' => 'required|string|max:255',
            'defendant' => 'required|string|max:255',
            'action_object' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|string',
            'priority' => 'required|string',
            'original_value' => 'required|numeric',
            'agreement_value' => 'nullable|numeric',
            'cause_value' => 'nullable|numeric',
            'comarca' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:2',
            'special_court' => 'nullable|string|in:Sim,Não',
            'opposing_lawyer' => 'nullable|string|max:255',
            'opposing_contact' => 'nullable|string|max:255',
            'tags' => 'nullable|array',
        ], $messages);

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

        if ($request->has('lawyer_id')) {
            $request->merge(['user_id' => $request->input('lawyer_id')]);
        }

        $messages = [
            'case_number.regex' => 'O formato deve ser NNNNNNN-DD.AAAA.J.TR.OOOO (Padrão CNJ).',
            'case_number.unique' => 'Este número de processo já pertence a outro caso.'
        ];

        $validatedData = $request->validate([
            'case_number' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'unique:legal_cases,case_number,' . $case->id, // Ignora o próprio ID na verificação de único
                'regex:/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/'
            ],
            'start_date' => 'nullable|date',
            'client_id' => 'sometimes|required|exists:clients,id',
            'user_id' => 'sometimes|required|exists:users,id', 
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
            'special_court' => 'nullable|string|in:Sim,Não',
            'opposing_lawyer' => 'nullable|string|max:255',
            'opposing_contact' => 'nullable|string|max:255',
            'tags' => 'nullable|array',
        ], $messages);

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

        DB::beginTransaction();

        try {
            foreach ($casesToImport as $index => $caseData) {
                
                if (isset($caseData['lawyer_id'])) {
                    $caseData['user_id'] = $caseData['lawyer_id'];
                    unset($caseData['lawyer_id']);
                }

                $validator = Validator::make($caseData, [
                    'case_number' => 'required|string|max:255',
                    'opposing_party' => 'required|string|max:255',
                    'defendant' => 'required|string|max:255',
                    'user_id' => 'required|exists:users,id', 
                    'action_object' => 'required|string|max:255',
                    'priority' => 'required|string|in:baixa,media,alta',
                    'cause_value' => 'nullable|numeric',
                    'original_value' => 'nullable|numeric',
                    'agreement_value' => 'nullable|numeric',
                ]);

                if ($validator->fails()) {
                    $errors[] = [
                        'line' => $index + 2,
                        'errors' => $validator->errors()->all()
                    ];
                } else {
                    $caseData['client_id'] = $clientId;
                    $caseData['status'] = 'initial_analysis';
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
                'message' => "Importação concluída com sucesso!",
                'success_count' => $successCount,
                'errors' => [],
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Um erro inesperado ocorreu no servidor.', 'error' => $e->getMessage()], 500);
        }
    }
}