<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $hasReason = Schema::hasColumn('legal_cases', 'reanalysis_reason');
        $hasRequestedAt = Schema::hasColumn('legal_cases', 'reanalysis_requested_at');
        $hasRequestedBy = Schema::hasColumn('legal_cases', 'reanalysis_requested_by_user_id');

        Schema::table('legal_cases', function (Blueprint $table) use ($hasReason, $hasRequestedAt, $hasRequestedBy) {
            if (!$hasReason) {
                $table->text('reanalysis_reason')->nullable()->after('contra_indicated_by_user_id');
            }

            if (!$hasRequestedAt) {
                $table->timestamp('reanalysis_requested_at')->nullable()->after('reanalysis_reason');
            }

            if (!$hasRequestedBy) {
                $table->foreignId('reanalysis_requested_by_user_id')
                    ->nullable()
                    ->after('reanalysis_requested_at')
                    ->constrained('users')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        $hasRequestedBy = Schema::hasColumn('legal_cases', 'reanalysis_requested_by_user_id');
        $hasRequestedAt = Schema::hasColumn('legal_cases', 'reanalysis_requested_at');
        $hasReason = Schema::hasColumn('legal_cases', 'reanalysis_reason');

        if ($hasRequestedBy) {
            Schema::table('legal_cases', function (Blueprint $table) {
                $table->dropConstrainedForeignId('reanalysis_requested_by_user_id');
            });
        }

        Schema::table('legal_cases', function (Blueprint $table) use ($hasRequestedAt, $hasReason) {
            if ($hasRequestedAt) {
                $table->dropColumn('reanalysis_requested_at');
            }

            if ($hasReason) {
                $table->dropColumn('reanalysis_reason');
            }
        });
    }
};
