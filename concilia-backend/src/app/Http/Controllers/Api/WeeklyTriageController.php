<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\LegalCase;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Triagem da planilha semanal de campanhas do banco (o que a Fernanda fazia à mão):
 * - "Pendente" no portal: volta para Análise Inicial; sem responsável, é distribuído.
 * - "Em tratamento" com nome de operador na observação: Proposta Enviada para esse operador.
 * - "Em tratamento" sem nome: Análise Inicial e redistribuição.
 * Casos em negociação ou com acordo nunca são movidos (mesma trava da mudança em lote).
 */
class WeeklyTriageController extends Controller
{
    private const PORTAL_PENDING = 'pendente';
    private const PORTAL_IN_PROGRESS = 'em tratamento';

    // Etapas da fila: só elas podem ser movidas pela triagem
    private const QUEUE_STATUSES = [
        LegalCase::STATUS_INITIAL_ANALYSIS,
        LegalCase::STATUS_INDICATIONS,
        LegalCase::STATUS_CONTRA_INDICATED,
        LegalCase::STATUS_FAILED_DEAL,
    ];

    public function __invoke(Request $request): JsonResponse
    {
        if (!in_array(Auth::user()?->role, ['administrador', 'supervisor'], true)) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $validated = $request->validate([
            'mode' => 'required|in:preview,apply',
            'rows' => 'required|array|min:1|max:5000',
            'rows.*.case_number' => 'required|string|max:255',
            'rows.*.portal_status' => 'nullable|string|max:255',
            'rows.*.portal_obs' => 'nullable|string|max:4000',
            'operator_ids' => 'nullable|array',
            'operator_ids.*' => 'integer',
            'redistribute_untreated' => 'nullable|boolean',
            'file_name' => 'nullable|string|max:255',
        ]);

        $operators = User::query()
            ->where('role', 'operador')
            ->where('status', 'ativo')
            ->orderBy('name')
            ->get(['id', 'name']);

        $selectedOperatorIds = collect($validated['operator_ids'] ?? $operators->pluck('id')->all())
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $operators->contains('id', $id))
            ->values();

        $plan = $this->buildPlan(
            $validated['rows'],
            $operators,
            $selectedOperatorIds->all(),
            (bool) ($validated['redistribute_untreated'] ?? true)
        );

        if ($validated['mode'] === 'preview') {
            return response()->json($this->presentPlan($plan, $operators, $selectedOperatorIds->all()));
        }

        $result = DB::transaction(fn () => $this->applyPlan($plan, $operators));

        try {
            AuditLog::create([
                'user_id' => Auth::id(),
                'user_name' => Auth::user()?->name ?? 'Sistema',
                'action' => 'Triagem da planilha semanal',
                'details' => sprintf(
                    'Triagem automática%s: %d para Análise Inicial, %d para Proposta Enviada, %d responsáveis distribuídos, %d mantidos em etapa avançada.',
                    !empty($validated['file_name']) ? " ({$validated['file_name']})" : '',
                    $result['to_initial'],
                    $result['to_proposal'],
                    $result['distributed'],
                    $result['kept_advanced']
                ),
                'ip_address' => $request->ip(),
            ]);
        } catch (\Exception $e) {
            Log::error('Erro AuditLog weekly triage: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Triagem aplicada.',
            'result' => $result,
            ...$this->presentPlan($plan, $operators, $selectedOperatorIds->all()),
        ]);
    }

    /**
     * Uma entrada por processo da planilha com a ação decidida a partir do estado atual no NIC.
     */
    private function buildPlan(array $rows, $operators, array $distributionOperatorIds, bool $redistributeUntreated): array
    {
        $byDigits = [];
        foreach ($rows as $row) {
            $digits = preg_replace('/\D/', '', (string) $row['case_number']);
            if ($digits !== '') {
                $byDigits[$digits] = $row; // repetido na planilha: vale a última linha
            }
        }

        $cases = LegalCase::query()
            ->whereNull('archived_at')
            ->whereIn(DB::raw("REGEXP_REPLACE(case_number, '[^0-9]', '')"), array_keys($byDigits))
            ->get(['id', 'case_number', 'status', 'user_id'])
            ->keyBy(fn ($case) => preg_replace('/\D/', '', $case->case_number));

        $nonOperatorUsers = User::query()
            ->whereIn('role', ['administrador', 'supervisor'])
            ->where('status', 'ativo')
            ->get(['id', 'name']);

        $plan = [];
        foreach ($byDigits as $digits => $row) {
            $portalStatus = $this->normalize($row['portal_status'] ?? '');
            $obs = trim((string) ($row['portal_obs'] ?? ''));
            $case = $cases->get($digits);

            $item = [
                'case_number' => $case?->case_number ?? $row['case_number'],
                'case_id' => $case?->id,
                'portal_status' => $row['portal_status'] ?? null,
                'portal_obs' => $obs !== '' ? $obs : null,
                'current_status' => $case?->status,
                'current_user_id' => $case?->user_id,
                'new_status' => null,
                'new_user_id' => null,
                'distribute' => false,
                'group' => 'ignored',
                'reason' => null,
            ];

            if (!in_array($portalStatus, [self::PORTAL_PENDING, self::PORTAL_IN_PROGRESS], true)) {
                $item['reason'] = 'Situação no portal sem regra de triagem (só a importação atualiza).';
                $plan[] = $item;
                continue;
            }

            if (!$case) {
                $item['group'] = 'not_found';
                $item['reason'] = 'Processo não está no NIC (ou está arquivado). Importe a planilha antes da triagem.';
                $plan[] = $item;
                continue;
            }

            $isQueue = in_array($case->status, self::QUEUE_STATUSES, true);

            if ($portalStatus === self::PORTAL_PENDING) {
                if (!$isQueue) {
                    $item['group'] = 'kept_advanced';
                    $item['reason'] = 'Pendente no portal, mas em negociação ou com acordo no NIC: mantido.';
                } else {
                    $item['group'] = 'pending_to_initial';
                    $item['new_status'] = LegalCase::STATUS_INITIAL_ANALYSIS;
                    $item['distribute'] = empty($case->user_id);
                    $item['reason'] = $case->status === LegalCase::STATUS_INITIAL_ANALYSIS
                        ? 'Já está na Análise Inicial.'
                        : 'Voltou como pendente no portal.';
                }
                $plan[] = $item;
                continue;
            }

            // Em tratamento
            [$operator, $otherUser] = $this->findNamedUser($obs, $operators, $nonOperatorUsers);

            if ($operator) {
                $item['new_user_id'] = $operator->id;
                if ($isQueue) {
                    $item['group'] = 'to_proposal';
                    $item['new_status'] = LegalCase::STATUS_PROPOSAL_SENT;
                    $item['reason'] = "Em tratamento com {$operator->name}.";
                } elseif ($case->status === LegalCase::STATUS_PROPOSAL_SENT) {
                    $item['group'] = 'to_proposal';
                    $item['reason'] = "Já em Proposta Enviada; responsável conferido ({$operator->name}).";
                } else {
                    $item['group'] = 'kept_advanced';
                    $item['new_user_id'] = null;
                    $item['reason'] = "Em tratamento com {$operator->name}, mas já está mais adiante no NIC: mantido.";
                }
            } elseif ($otherUser) {
                $item['group'] = 'named_not_operator';
                $item['reason'] = "Observação cita {$otherUser->name}, que não é operador: mantido para decisão manual.";
            } elseif ($isQueue) {
                $item['group'] = 'untreated_to_initial';
                $item['new_status'] = LegalCase::STATUS_INITIAL_ANALYSIS;
                $item['distribute'] = $redistributeUntreated || empty($case->user_id);
                $item['reason'] = 'Em tratamento sem operador identificado na observação.';
            } else {
                $item['group'] = 'kept_advanced';
                $item['reason'] = 'Em tratamento sem nome, mas já em negociação ou com acordo no NIC: mantido.';
            }

            $plan[] = $item;
        }

        return $this->assignDistribution($plan, $distributionOperatorIds);
    }

    /**
     * Distribui igualmente entre os operadores escolhidos, em ordem estável (número do processo).
     */
    private function assignDistribution(array $plan, array $operatorIds): array
    {
        if (empty($operatorIds)) {
            foreach ($plan as &$item) {
                if ($item['distribute']) {
                    $item['distribute'] = false;
                    $item['reason'] .= ' (nenhum operador selecionado para distribuir)';
                }
            }
            unset($item);

            return $plan;
        }

        $toDistribute = array_keys(array_filter($plan, fn ($item) => $item['distribute']));
        usort($toDistribute, fn ($a, $b) => strcmp($plan[$a]['case_number'], $plan[$b]['case_number']));

        foreach ($toDistribute as $position => $index) {
            $plan[$index]['new_user_id'] = $operatorIds[$position % count($operatorIds)];
        }

        return $plan;
    }

    private function applyPlan(array $plan, $operators): array
    {
        $now = Carbon::now();
        $names = $operators->pluck('name', 'id');
        $result = ['to_initial' => 0, 'to_proposal' => 0, 'distributed' => 0, 'responsible_changed' => 0, 'kept_advanced' => 0, 'unchanged' => 0];
        $historyRows = [];

        foreach ($plan as $item) {
            if ($item['group'] === 'kept_advanced') {
                $result['kept_advanced']++;
            }
            if (!$item['case_id'] || (!$item['new_status'] && !$item['new_user_id'])) {
                continue;
            }

            // Relê o caso dentro da transação: a trava vale sobre o estado atual
            $case = LegalCase::whereKey($item['case_id'])->lockForUpdate()->first();
            if (!$case || !in_array($case->status, array_merge(self::QUEUE_STATUSES, [LegalCase::STATUS_PROPOSAL_SENT]), true)) {
                $result['kept_advanced']++;
                continue;
            }
            if ($item['new_status'] === LegalCase::STATUS_INITIAL_ANALYSIS && !in_array($case->status, self::QUEUE_STATUSES, true)) {
                $result['kept_advanced']++;
                continue;
            }

            $update = [];
            $old = [];
            $new = [];

            if ($item['new_status'] && $item['new_status'] !== $case->status) {
                $update += [
                    'status' => $item['new_status'],
                    'status_started_at' => $now,
                    'contra_indication_reason' => null,
                    'contra_indication_reason_id' => null,
                    'contra_indicated_at' => null,
                    'contra_indicated_by_user_id' => null,
                    'failed_deal_reason' => null,
                    'failed_deal_reason_id' => null,
                    'failed_deal_at' => null,
                    'failed_deal_by_user_id' => null,
                ];
                $old['status'] = $case->status;
                $new['status'] = $item['new_status'];
                if ($case->status === LegalCase::STATUS_CONTRA_INDICATED) {
                    $old['contra_indication_reason'] = $case->contra_indication_reason;
                }
                $item['new_status'] === LegalCase::STATUS_PROPOSAL_SENT ? $result['to_proposal']++ : $result['to_initial']++;
            }

            if ($item['new_user_id'] && (int) $item['new_user_id'] !== (int) $case->user_id) {
                $update['user_id'] = $item['new_user_id'];
                $old['user_id'] = $case->user_id;
                $new['user_id'] = $item['new_user_id'];
                $item['distribute'] ? $result['distributed']++ : $result['responsible_changed']++;
            }

            if (empty($update)) {
                $result['unchanged']++;
                continue;
            }

            $update['updated_at'] = $now;
            LegalCase::whereKey($case->id)->update($update);

            $responsibleNote = isset($new['user_id']) ? ' Responsável: ' . ($names[$new['user_id']] ?? $new['user_id']) . '.' : '';
            $historyRows[] = [
                'legal_case_id' => $case->id,
                'user_id' => Auth::id(),
                'event_type' => 'update',
                'description' => 'Triagem da planilha semanal do banco: ' . rtrim($item['reason'], '.') . '.' . $responsibleNote,
                'old_values' => json_encode($old),
                'new_values' => json_encode($new),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($historyRows, 500) as $chunk) {
            DB::table('case_histories')->insert($chunk);
        }

        return $result;
    }

    private function presentPlan(array $plan, $operators, array $distributionOperatorIds): array
    {
        $names = $operators->pluck('name', 'id');
        $groups = [];
        $distribution = [];
        $proposalByOperator = [];

        foreach ($plan as $item) {
            $groups[$item['group']] = ($groups[$item['group']] ?? 0) + 1;
            if ($item['distribute'] && $item['new_user_id']) {
                $distribution[$item['new_user_id']] = ($distribution[$item['new_user_id']] ?? 0) + 1;
            }
            if ($item['group'] === 'to_proposal' && $item['new_user_id']) {
                $proposalByOperator[$item['new_user_id']] = ($proposalByOperator[$item['new_user_id']] ?? 0) + 1;
            }
        }

        $items = array_map(function ($item) use ($names) {
            $item['new_user_name'] = $item['new_user_id'] ? ($names[$item['new_user_id']] ?? null) : null;
            $item['changes_status'] = $item['new_status'] && $item['new_status'] !== $item['current_status'];
            return $item;
        }, $plan);

        return [
            'total' => count($plan),
            'groups' => $groups,
            'moves_to_initial' => count(array_filter($items, fn ($i) => $i['changes_status'] && $i['new_status'] === LegalCase::STATUS_INITIAL_ANALYSIS)),
            'moves_to_proposal' => count(array_filter($items, fn ($i) => $i['changes_status'] && $i['new_status'] === LegalCase::STATUS_PROPOSAL_SENT)),
            'operators' => $operators->map(fn ($operator) => [
                'id' => $operator->id,
                'name' => $operator->name,
                'selected' => in_array($operator->id, $distributionOperatorIds, true),
                'distributed' => $distribution[$operator->id] ?? 0,
                'proposals' => $proposalByOperator[$operator->id] ?? 0,
            ])->values(),
            'items' => array_values(array_filter($items, fn ($i) => $i['group'] !== 'ignored')),
        ];
    }

    /**
     * Procura o primeiro nome de um operador na observação (sem acento, palavra inteira).
     * Retorna [operador, outroUsuário]; nome ambíguo entre operadores não conta.
     */
    private function findNamedUser(string $obs, $operators, $nonOperatorUsers): array
    {
        $text = ' ' . preg_replace('/[^a-z0-9]+/', ' ', $this->normalize($obs)) . ' ';
        if (trim($text) === '') {
            return [null, null];
        }

        $matches = fn ($users) => $users->filter(function ($user) use ($text) {
            $first = explode(' ', preg_replace('/[^a-z0-9]+/', ' ', $this->normalize($user->name)))[0] ?? '';
            return strlen($first) >= 3 && str_contains($text, " {$first} ");
        })->values();

        $operatorMatches = $matches($operators);
        if ($operatorMatches->count() === 1) {
            return [$operatorMatches->first(), null];
        }
        if ($operatorMatches->count() > 1) {
            return [null, null];
        }

        $otherMatches = $matches($nonOperatorUsers);

        return [null, $otherMatches->count() === 1 ? $otherMatches->first() : null];
    }

    private function normalize(?string $value): string
    {
        return Str::ascii(mb_strtolower(trim((string) $value)));
    }
}
