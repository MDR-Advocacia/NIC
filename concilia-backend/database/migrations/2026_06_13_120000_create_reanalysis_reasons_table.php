<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reanalysis_reasons', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        DB::table('reanalysis_reasons')->insert([
            ['name' => 'Novas informações sobre o caso', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Erro na análise anterior', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Mudança no valor da causa', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Alteração na situação processual', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Solicitação da parte', 'created_at' => now(), 'updated_at' => now()],
        ]);

        if (!Schema::hasColumn('legal_cases', 'reanalysis_reason_id')) {
            Schema::table('legal_cases', function (Blueprint $table) {
                $table->foreignId('reanalysis_reason_id')
                    ->nullable()
                    ->after('reanalysis_reason')
                    ->constrained('reanalysis_reasons')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('legal_cases', 'reanalysis_reason_id')) {
            Schema::table('legal_cases', function (Blueprint $table) {
                $table->dropConstrainedForeignId('reanalysis_reason_id');
            });
        }

        Schema::dropIfExists('reanalysis_reasons');
    }
};
