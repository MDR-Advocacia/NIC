<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tabela de Autores (Plaintiffs) - Quem processa
        Schema::create('plaintiffs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('cpf_cnpj')->nullable(); // CPF ou CNPJ
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->timestamps();
        });

        // Tabela de Réus (Defendants) - Quem é processado
        Schema::create('defendants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('cnpj')->nullable(); // Geralmente empresas
            $table->string('phone')->nullable();
            $table->timestamps();
        });

        // Adicionar colunas de relacionamento na tabela legal_cases
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->foreignId('plaintiff_id')->nullable()->constrained('plaintiffs')->nullOnDelete();
            $table->foreignId('defendant_id')->nullable()->constrained('defendants')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->dropForeign(['plaintiff_id']);
            $table->dropColumn('plaintiff_id');
            $table->dropForeign(['defendant_id']);
            $table->dropColumn('defendant_id');
        });

        Schema::dropIfExists('defendants');
        Schema::dropIfExists('plaintiffs');
    }
};