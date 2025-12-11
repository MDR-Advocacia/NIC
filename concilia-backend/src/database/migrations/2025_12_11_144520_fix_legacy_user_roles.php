<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Atualiza todos os usuários 'admin' para 'administrador'
        DB::table('users')
            ->where('role', 'admin')
            ->update(['role' => 'administrador']);
    }

    public function down(): void
    {
        // Reverte (opcional, mas boa prática)
        DB::table('users')
            ->where('role', 'administrador')
            ->update(['role' => 'admin']);
    }
};