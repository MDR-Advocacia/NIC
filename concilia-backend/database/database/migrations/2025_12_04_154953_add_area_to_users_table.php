<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::table('users', function (Blueprint $table) {
        // Verifica se a coluna já existe para não dar erro
        if (!Schema::hasColumn('users', 'area')) {
            // Cria a coluna 'area' logo depois da coluna 'role'
            $table->string('area')->nullable()->after('role');
        }
    });
}

public function down()
{
    Schema::table('users', function (Blueprint $table) {
        if (Schema::hasColumn('users', 'area')) {
            $table->dropColumn('area');
        }
    });
}
};
