<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('legal_cases', 'status_started_at')) {
            Schema::table('legal_cases', function (Blueprint $table) {
                $table->timestamp('status_started_at')->nullable();
            });
        }

        if (!Schema::hasTable('case_histories')) {
            DB::table('legal_cases')
                ->whereNull('status_started_at')
                ->update(['status_started_at' => DB::raw('COALESCE(created_at, updated_at, CURRENT_TIMESTAMP)')]);

            return;
        }

        DB::table('legal_cases')
            ->select('id', 'status', 'created_at', 'updated_at')
            ->whereNull('status_started_at')
            ->orderBy('id')
            ->chunkById(500, function ($cases) {
                $caseIds = $cases->pluck('id')->all();

                $historiesByCase = DB::table('case_histories')
                    ->select('legal_case_id', 'new_values', 'created_at')
                    ->whereIn('legal_case_id', $caseIds)
                    ->orderBy('legal_case_id')
                    ->orderByDesc('created_at')
                    ->get()
                    ->groupBy('legal_case_id');

                foreach ($cases as $case) {
                    $statusStartedAt = null;

                    foreach ($historiesByCase->get($case->id, collect()) as $history) {
                        $newValues = json_decode($history->new_values ?: '{}', true);

                        if (is_array($newValues) && ($newValues['status'] ?? null) === $case->status) {
                            $statusStartedAt = $history->created_at;
                            break;
                        }
                    }

                    DB::table('legal_cases')
                        ->where('id', $case->id)
                        ->update([
                            'status_started_at' => $statusStartedAt
                                ?: $case->created_at
                                ?: $case->updated_at
                                ?: now(),
                        ]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('legal_cases', 'status_started_at')) {
            Schema::table('legal_cases', function (Blueprint $table) {
                $table->dropColumn('status_started_at');
            });
        }
    }
};
