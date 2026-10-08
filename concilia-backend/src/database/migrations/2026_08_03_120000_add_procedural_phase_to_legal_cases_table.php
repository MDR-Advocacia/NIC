<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->string('procedural_phase', 30)
                ->nullable()
                ->after('special_court')
                ->comment('Fase processual: inicial, sentenca, recurso ou cumprimento');
            $table->index('procedural_phase');
        });
    }

    public function down(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->dropIndex(['procedural_phase']);
            $table->dropColumn('procedural_phase');
        });
    }
};
