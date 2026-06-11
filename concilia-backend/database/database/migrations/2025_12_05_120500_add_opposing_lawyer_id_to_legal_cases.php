<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            // CORREÇÃO: Usamos 'user_id' pois 'lawyer_id' não existe mais na tabela
            $table->unsignedBigInteger('opposing_lawyer_id')->nullable()->after('user_id');
            
            $table->foreign('opposing_lawyer_id')->references('id')->on('opposing_lawyers')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->dropForeign(['opposing_lawyer_id']);
            $table->dropColumn('opposing_lawyer_id');
        });
    }
};