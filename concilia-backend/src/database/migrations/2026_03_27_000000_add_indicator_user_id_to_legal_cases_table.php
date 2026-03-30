<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('legal_cases', 'indicator_user_id')) {
            return;
        }

        Schema::table('legal_cases', function (Blueprint $table) {
            $table->foreignId('indicator_user_id')
                ->nullable()
                ->after('user_id')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('legal_cases', 'indicator_user_id')) {
            return;
        }

        Schema::table('legal_cases', function (Blueprint $table) {
            $table->dropConstrainedForeignId('indicator_user_id');
        });
    }
};
