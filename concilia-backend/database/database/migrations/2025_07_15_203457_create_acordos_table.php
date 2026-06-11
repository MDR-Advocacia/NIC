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
        Schema::create('acordos', function (Blueprint $table) {
            $table->id(); // Coluna de ID único para cada acordo

            $table->string('numero_processo')->unique(); // Número do processo, único para evitar duplicados
            $table->string('nome_cliente'); // Nome do cliente ou parte envolvida
            $table->string('documento_cliente'); // CPF ou CNPJ do cliente
            $table->decimal('valor_causa', 10, 2); // Valor original da causa
            $table->decimal('valor_acordo', 10, 2); // Valor final acordado
            $table->text('descricao')->nullable(); // Um campo para detalhes ou observações (pode ser nulo)
            $table->enum('status', ['ativo', 'em_negociacao', 'finalizado', 'cancelado'])->default('em_negociacao'); // Status do acordo

            // Chave estrangeira para conectar o acordo ao usuário que o criou
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            $table->timestamps(); // Cria as colunas 'created_at' e 'updated_at' automaticamente
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('acordos');
    }
};
