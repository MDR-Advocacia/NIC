<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $hasReason = Schema::hasColumn('legal_cases', 'contra_indication_reason');
        $hasContraIndicatedAt = Schema::hasColumn('legal_cases', 'contra_indicated_at');
        $hasContraIndicatedBy = Schema::hasColumn('legal_cases', 'contra_indicated_by_user_id');

        Schema::table('legal_cases', function (Blueprint $table) use ($hasReason, $hasContraIndicatedAt, $hasContraIndicatedBy) {
            if (!$hasReason) {
                $table->text('contra_indication_reason')->nullable()->after('status_started_at');
            }

            if (!$hasContraIndicatedAt) {
                $table->timestamp('contra_indicated_at')->nullable()->after('contra_indication_reason');
            }

            if (!$hasContraIndicatedBy) {
                $table->foreignId('contra_indicated_by_user_id')
                    ->nullable()
                    ->after('contra_indicated_at')
                    ->constrained('users')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        $hasContraIndicatedBy = Schema::hasColumn('legal_cases', 'contra_indicated_by_user_id');
        $hasContraIndicatedAt = Schema::hasColumn('legal_cases', 'contra_indicated_at');
        $hasReason = Schema::hasColumn('legal_cases', 'contra_indication_reason');

        if ($hasContraIndicatedBy) {
            Schema::table('legal_cases', function (Blueprint $table) {
                $table->dropConstrainedForeignId('contra_indicated_by_user_id');
            });
        }

        Schema::table('legal_cases', function (Blueprint $table) use ($hasContraIndicatedAt, $hasReason) {
            if ($hasContraIndicatedAt) {
                $table->dropColumn('contra_indicated_at');
            }

            if ($hasReason) {
                $table->dropColumn('contra_indication_reason');
            }
        });
    }
};
