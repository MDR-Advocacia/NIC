<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            // Coluna para o resultado final da probabilidade (0 a 100)
            $table->integer('agreement_probability')->nullable()->after('status');
            
            // Coluna JSON para guardar os critérios detalhados (Robô preenche aqui)
            $table->json('agreement_checklist_data')->nullable()->after('agreement_probability');
        });
    }

    public function down(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->dropColumn(['agreement_probability', 'agreement_checklist_data']);
        });
    }
};
