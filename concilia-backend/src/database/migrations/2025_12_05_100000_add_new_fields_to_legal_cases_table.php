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
            $table->string('internal_number')->nullable()->after('case_number');
            $table->string('city')->nullable()->after('state'); // Cidade
            $table->decimal('pcond_probability', 5, 2)->nullable()->after('agreement_probability'); // Probabilidade de Condenação (%)
            $table->decimal('updated_condemnation_value', 15, 2)->nullable()->after('agreement_value'); // Valor atualizado da condenação
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->dropColumn([
                'internal_number', 
                'city', 
                'pcond_probability', 
                'updated_condemnation_value'
            ]);
        });
    }
};