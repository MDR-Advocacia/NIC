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
        Schema::table('legal_cases', function (Blueprint $table) {
            // plaintiff_id = ID do Autor (vinculado a litigants)
            $table->foreignId('plaintiff_id')->nullable()->constrained('litigants')->nullOnDelete();
            
            // defendant_id = ID do Réu (vinculado a litigants)
            $table->foreignId('defendant_id')->nullable()->constrained('litigants')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->dropForeign(['plaintiff_id']);
            $table->dropColumn('plaintiff_id');
            $table->dropForeign(['defendant_id']);
            $table->dropColumn('defendant_id');
        });
    }
};