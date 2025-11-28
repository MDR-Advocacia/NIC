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
        Schema::create('legal_cases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients');
            
            // MUDANÇA AQUI: de 'lawyer_id' para 'user_id'
            $table->foreignId('user_id')->constrained('users'); 

            $table->string('case_number')->unique();
            $table->string('opposing_party');
            $table->text('description')->nullable();
            $table->enum('status', ['initial_analysis', 'proposal_sent', 'in_negotiation', 'awaiting_draft', 'closed_deal', 'failed_deal'])->default('initial_analysis');
            $table->enum('priority', ['baixa', 'media', 'alta'])->default('media');
            $table->decimal('original_value', 10, 2);
            $table->decimal('agreement_value', 10, 2)->nullable();
            $table->date('start_date')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cases');
    }
};
