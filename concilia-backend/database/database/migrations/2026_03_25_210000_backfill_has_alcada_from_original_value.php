<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('legal_cases')->update([
            'has_alcada' => DB::raw('CASE WHEN COALESCE(original_value, 0) > 0 THEN 1 ELSE 0 END'),
        ]);
    }

    public function down(): void
    {
        // Sem rollback de dados: a migration apenas realinha has_alcada com original_value.
    }
};
