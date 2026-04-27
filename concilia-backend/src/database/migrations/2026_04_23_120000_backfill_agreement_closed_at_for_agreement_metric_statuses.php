<?php

use App\Models\LegalCase;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('legal_cases')
            ->whereIn('status', LegalCase::AGREEMENT_METRIC_STATUSES)
            ->whereNull('agreement_closed_at')
            ->update([
                'agreement_closed_at' => DB::raw('DATE(updated_at)'),
            ]);
    }

    public function down(): void
    {
        // Backfill de dados apenas.
    }
};
