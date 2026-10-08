<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Os campos contra_indication_* são limpos quando o caso volta para a fila;
        // estes guardam a reincidência e a última contraindicação de forma permanente.
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->unsignedSmallInteger('contra_indication_count')->default(0)->index()
                ->comment('Quantas vezes o caso já foi contraindicado');
            $table->text('last_contra_indication_reason')->nullable();
            $table->unsignedBigInteger('last_contra_indication_reason_id')->nullable();
            $table->timestamp('last_contra_indicated_at')->nullable()->index();
            $table->string('last_contra_indicated_by_name')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->dropIndex(['contra_indication_count']);
            $table->dropIndex(['last_contra_indicated_at']);
            $table->dropColumn([
                'contra_indication_count',
                'last_contra_indication_reason',
                'last_contra_indication_reason_id',
                'last_contra_indicated_at',
                'last_contra_indicated_by_name',
            ]);
        });
    }
};
