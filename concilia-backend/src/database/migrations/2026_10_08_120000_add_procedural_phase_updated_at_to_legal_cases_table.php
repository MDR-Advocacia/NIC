<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A coluna procedural_phase vem da migration de 2026_08_03; aqui só a data da última atualização da fase
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->timestamp('procedural_phase_updated_at')->nullable()->after('procedural_phase')
                ->comment('Quando a fase processual foi atualizada pela última vez (importação ou edição)');
        });
    }

    public function down(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->dropColumn('procedural_phase_updated_at');
        });
    }
};
