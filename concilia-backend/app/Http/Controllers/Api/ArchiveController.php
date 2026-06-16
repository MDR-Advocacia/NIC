<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LegalCase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ArchiveController extends Controller
{
    public function index(Request $request)
    {
        $query = LegalCase::whereNotNull('archived_at')
            ->with(['client:id,name', 'responsible:id,name', 'indicator:id,name']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('case_number', 'like', "%{$search}%")
                  ->orWhere('opposing_party', 'like', "%{$search}%")
                  ->orWhere('defendant', 'like', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($reason = $request->input('archive_reason')) {
            $query->where('archive_reason', $reason);
        }

        if ($dateFrom = $request->input('archived_from')) {
            $query->where('archived_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->input('archived_to')) {
            $query->where('archived_at', '<=', $dateTo . ' 23:59:59');
        }

        $sortBy = $request->input('sort_by', 'archived_at');
        $sortDir = $request->input('sort_dir', 'desc');
        $allowedSorts = ['archived_at', 'case_number', 'status', 'original_value', 'agreement_value', 'created_at'];
        if (!in_array($sortBy, $allowedSorts)) $sortBy = 'archived_at';

        $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');

        $perPage = min((int) $request->input('per_page', 25), 100);

        $paginated = $query->paginate($perPage);

        $summary = DB::table('legal_cases')
            ->whereNotNull('archived_at')
            ->selectRaw("
                COUNT(*) as total,
                SUM(status = 'contra_indicated') as contra_indicated,
                SUM(status = 'failed_deal') as failed_deal,
                SUM(status = 'deal_completed') as deal_completed,
                SUM(status NOT IN ('contra_indicated','failed_deal','deal_completed')) as other
            ")
            ->first();

        return response()->json([
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'summary' => $summary,
        ]);
    }

    public function archive(Request $request)
    {
        $request->validate([
            'case_ids' => 'required|array|min:1',
            'case_ids.*' => 'integer|exists:legal_cases,id',
            'reason' => 'nullable|string|max:255',
        ]);

        $user = Auth::user();
        $now = Carbon::now();
        $reason = $request->input('reason', 'Arquivamento manual');

        $count = LegalCase::whereIn('id', $request->case_ids)
            ->whereNull('archived_at')
            ->update([
                'archived_at' => $now,
                'archived_by_user_id' => $user->id,
                'archive_reason' => $reason,
            ]);

        return response()->json([
            'message' => "{$count} caso(s) arquivado(s) com sucesso.",
            'archived_count' => $count,
        ]);
    }

    public function unarchive(Request $request)
    {
        $request->validate([
            'case_ids' => 'required|array|min:1',
            'case_ids.*' => 'integer|exists:legal_cases,id',
        ]);

        $count = LegalCase::whereIn('id', $request->case_ids)
            ->whereNotNull('archived_at')
            ->update([
                'archived_at' => null,
                'archived_by_user_id' => null,
                'archive_reason' => null,
            ]);

        return response()->json([
            'message' => "{$count} caso(s) desarquivado(s) com sucesso.",
            'unarchived_count' => $count,
        ]);
    }

    public function archivablePreview(Request $request)
    {
        $statuses = ['contra_indicated', 'failed_deal', 'deal_completed'];

        $candidates = LegalCase::whereIn('status', $statuses)
            ->whereNull('archived_at')
            ->select('id', 'case_number', 'status', 'opposing_party', 'original_value', 'agreement_value', 'updated_at')
            ->orderBy('updated_at', 'asc')
            ->limit(500)
            ->get();

        $counts = DB::table('legal_cases')
            ->whereIn('status', $statuses)
            ->whereNull('archived_at')
            ->selectRaw("
                COUNT(*) as total,
                SUM(status = 'contra_indicated') as contra_indicated,
                SUM(status = 'failed_deal') as failed_deal,
                SUM(status = 'deal_completed') as deal_completed
            ")
            ->first();

        return response()->json([
            'candidates' => $candidates,
            'counts' => $counts,
        ]);
    }

    public function compareUpload(Request $request)
    {
        $request->validate([
            'case_numbers' => 'required|array|min:1',
            'case_numbers.*' => 'string',
        ]);

        $inputNumbers = collect($request->case_numbers)->map(fn($n) => trim($n))->filter()->unique()->values();

        $found = LegalCase::whereIn('case_number', $inputNumbers->toArray())
            ->select('id', 'case_number', 'status', 'opposing_party', 'original_value', 'agreement_value', 'archived_at')
            ->get()
            ->keyBy('case_number');

        $results = $inputNumbers->map(function ($num) use ($found) {
            $case = $found->get($num);
            if (!$case) {
                return ['case_number' => $num, 'found' => false, 'status' => null, 'already_archived' => false, 'id' => null];
            }
            return [
                'case_number' => $num,
                'found' => true,
                'id' => $case->id,
                'status' => $case->status,
                'opposing_party' => $case->opposing_party,
                'original_value' => $case->original_value,
                'already_archived' => !is_null($case->archived_at),
            ];
        });

        return response()->json([
            'total_input' => $inputNumbers->count(),
            'found' => $results->where('found', true)->count(),
            'not_found' => $results->where('found', false)->count(),
            'already_archived' => $results->where('already_archived', true)->count(),
            'archivable' => $results->where('found', true)->where('already_archived', false)->count(),
            'results' => $results->values(),
        ]);
    }
}
