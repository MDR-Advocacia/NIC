<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('case_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('legal_case_id')->constrained('legal_cases')->cascadeOnDelete();
            $table->string('type', 40)->index();
            $table->string('filename');
            $table->string('mime_type', 100);
            $table->unsignedInteger('size');
            $table->binary('content');
            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        DB::statement('ALTER TABLE case_attachments MODIFY content LONGBLOB NOT NULL');

        Schema::table('legal_cases', function (Blueprint $table) {
            $table->boolean('agreement_fraud_insurance')
                ->nullable()
                ->after('agreement_closed_at')
                ->comment('Acordo envolve materia de golpe ou seguro prestamista');
            $table->boolean('legal_opinion_portal_confirmed')
                ->nullable()
                ->after('agreement_fraud_insurance')
                ->comment('Operador confirmou que o parecer foi anexado no portal do banco');
        });
    }

    public function down(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->dropColumn(['agreement_fraud_insurance', 'legal_opinion_portal_confirmed']);
        });

        Schema::dropIfExists('case_attachments');
    }
};
