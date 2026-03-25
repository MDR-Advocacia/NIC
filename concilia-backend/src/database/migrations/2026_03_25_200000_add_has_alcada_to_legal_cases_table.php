<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->boolean('has_alcada')->default(false)->after('original_value');
            $table->index(['has_alcada', 'status'], 'idx_alcada_status');
        });

        // Casos que já possuem original_value > 0 são marcados como tendo alçada
        DB::table('legal_cases')
            ->where('original_value', '>', 0)
            ->update(['has_alcada' => true]);
    }

    public function down(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->dropIndex('idx_alcada_status');
            $table->dropColumn('has_alcada');
        });
    }
};
