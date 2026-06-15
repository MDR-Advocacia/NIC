<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $hasReason = Schema::hasColumn('legal_cases', 'failed_deal_reason');

        if (!$hasReason) {
            Schema::table('legal_cases', function (Blueprint $table) {
                $table->text('failed_deal_reason')->nullable()->after('reanalysis_requested_by_user_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('legal_cases', 'failed_deal_reason')) {
            Schema::table('legal_cases', function (Blueprint $table) {
                $table->dropColumn('failed_deal_reason');
            });
        }
    }
};
