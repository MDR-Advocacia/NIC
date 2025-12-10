<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('opposing_lawyers', function (Blueprint $table) {
            $table->boolean('is_abusive')->default(false)->after('email'); // Litigante Abusivo
        });
    }

    public function down(): void
    {
        Schema::table('opposing_lawyers', function (Blueprint $table) {
            $table->dropColumn('is_abusive');
        });
    }
};