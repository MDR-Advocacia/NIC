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
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null'); // Quem fez? (Pode ser nulo se for sistema)
            $table->string('action'); // O que fez? (ex: "create_case", "login", "delete_user")
            $table->text('description')->nullable(); // Detalhes legíveis (ex: "Criou o caso #123")
            $table->json('details')->nullable(); // Dados técnicos (ex: antigo vs novo)
            $table->string('ip_address')->nullable(); // De onde?
            $table->timestamps(); // Quando? (created_at)
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