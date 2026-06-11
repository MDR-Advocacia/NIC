<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $fallbackUserId = DB::table('users')->orderBy('id')->value('id');

        if ($fallbackUserId === null) {
            throw new RuntimeException('Nenhum usuário encontrado para restaurar legal_cases.user_id como obrigatório.');
        }

        DB::table('legal_cases')
            ->whereNull('user_id')
            ->update(['user_id' => $fallbackUserId]);

        Schema::table('legal_cases', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
        });
    }
};
