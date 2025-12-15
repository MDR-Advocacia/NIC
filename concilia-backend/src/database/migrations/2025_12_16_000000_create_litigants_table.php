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
        Schema::create('litigants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type')->nullable(); // 'PF' (Pessoa Física) ou 'PJ' (Pessoa Jurídica)
            $table->string('doc_number')->nullable(); // CPF ou CNPJ
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('litigants');
    }
};