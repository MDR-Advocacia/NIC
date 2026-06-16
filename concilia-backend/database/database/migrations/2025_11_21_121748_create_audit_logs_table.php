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
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            
            // ID do usuário (pode ser nulo se o usuário for deletado depois)
            $table->unsignedBigInteger('user_id')->nullable();
            
            // --- A COLUNA QUE FALTAVA ---
            $table->string('user_name')->nullable(); 
            
            // O que foi feito
            $table->string('action'); 
            
            // Detalhes em texto (mudamos de JSON para TEXT para aceitar a string do Controller)
            $table->text('details')->nullable(); 
            
            $table->string('ip_address')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};