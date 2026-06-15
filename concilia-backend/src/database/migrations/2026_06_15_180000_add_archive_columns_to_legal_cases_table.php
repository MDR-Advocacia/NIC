<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            if (!Schema::hasColumn('legal_cases', 'archived_at')) {
                $table->timestamp('archived_at')->nullable();
            }
            if (!Schema::hasColumn('legal_cases', 'archived_by_user_id')) {
                $table->foreignId('archived_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('legal_cases', 'archive_reason')) {
                $table->string('archive_reason')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            if (Schema::hasColumn('legal_cases', 'archived_by_user_id')) {
                $table->dropConstrainedForeignId('archived_by_user_id');
            }
            if (Schema::hasColumn('legal_cases', 'archived_at')) {
                $table->dropColumn('archived_at');
            }
            if (Schema::hasColumn('legal_cases', 'archive_reason')) {
                $table->dropColumn('archive_reason');
            }
        });
    }
};
