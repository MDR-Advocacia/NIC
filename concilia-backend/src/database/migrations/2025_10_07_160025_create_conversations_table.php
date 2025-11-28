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
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->string('contact_name')->nullable();
            $table->string('contact_phone')->nullable();
            
            // ADICIONE/GARANTA QUE ESTAS LINHAS EXISTEM
            $table->text('last_message')->nullable(); // Coluna para a última mensagem
            $table->bigInteger('timestamp')->nullable(); // Coluna para a data/hora
            
            // Coluna para o vínculo com o caso (provavelmente já existe)
            $table->foreignId('legal_case_id')->nullable()->constrained('legal_cases')->onDelete('set null');
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};