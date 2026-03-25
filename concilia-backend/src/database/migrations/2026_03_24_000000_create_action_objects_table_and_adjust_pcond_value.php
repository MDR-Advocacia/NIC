<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('action_objects', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::table('legal_cases', function (Blueprint $table) {
            $table->foreignId('action_object_id')
                ->nullable()
                ->after('action_object')
                ->constrained('action_objects')
                ->nullOnDelete();
        });

        DB::statement("
            ALTER TABLE legal_cases
            MODIFY pcond_probability DECIMAL(15,2) NULL COMMENT 'Valor da PCOND'
        ");

        $existingActionObjects = DB::table('legal_cases')
            ->whereNotNull('action_object')
            ->where('action_object', '!=', '')
            ->pluck('action_object')
            ->map(fn ($name) => trim((string) $name))
            ->filter()
            ->unique()
            ->values();

        $now = now();

        foreach ($existingActionObjects as $name) {
            DB::table('action_objects')->insertOrIgnore([
                'name' => mb_substr($name, 0, 255),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $legalCases = DB::table('legal_cases')
            ->select('id', 'action_object')
            ->whereNotNull('action_object')
            ->where('action_object', '!=', '')
            ->get();

        foreach ($legalCases as $legalCase) {
            $normalizedName = trim((string) $legalCase->action_object);

            if ($normalizedName === '') {
                continue;
            }

            $actionObjectId = DB::table('action_objects')
                ->where('name', $normalizedName)
                ->value('id');

            if ($actionObjectId) {
                DB::table('legal_cases')
                    ->where('id', $legalCase->id)
                    ->update(['action_object_id' => $actionObjectId]);
            }
        }
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE legal_cases
            MODIFY pcond_probability DECIMAL(5,2) NULL COMMENT 'Probabilidade de Condenação (%)'
        ");

        Schema::table('legal_cases', function (Blueprint $table) {
            $table->dropForeign(['action_object_id']);
            $table->dropColumn('action_object_id');
        });

        Schema::dropIfExists('action_objects');
    }
};
