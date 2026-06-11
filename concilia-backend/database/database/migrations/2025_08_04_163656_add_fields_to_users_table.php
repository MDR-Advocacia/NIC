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
        Schema::table('users', function (Blueprint $table) {
            $table->string('status')->default('ativo'); // LINHA REMOVIDA/COMENTADA
            # $table->string('role')->default('operador'); // LINHA JÁ REMOVIDA ANTES
            $table->string('phone')->nullable();
            $table->timestamp('last_login_at')->nullable();

            $table->foreignId('department_id')->nullable()->constrained('departments');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            //
        });
    }
};
