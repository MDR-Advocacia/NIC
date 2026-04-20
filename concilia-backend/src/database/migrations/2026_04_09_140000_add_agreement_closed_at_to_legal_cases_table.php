<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('legal_cases', 'agreement_closed_at')) {
            Schema::table('legal_cases', function (Blueprint $table) {
                $table->date('agreement_closed_at')->nullable();
            });
        }

        DB::table('legal_cases')
            ->where('status', 'closed_deal')
            ->whereNull('agreement_closed_at')
            ->update([
                'agreement_closed_at' => DB::raw('DATE(updated_at)'),
            ]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('legal_cases', 'agreement_closed_at')) {
            Schema::table('legal_cases', function (Blueprint $table) {
                $table->dropColumn('agreement_closed_at');
            });
        }
    }
};
