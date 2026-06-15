<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('failed_deal_reasons', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::table('legal_cases', function (Blueprint $table) {
            if (!Schema::hasColumn('legal_cases', 'failed_deal_reason')) {
                $table->text('failed_deal_reason')->nullable()->after('contra_indication_reason_id');
            }
        });

        Schema::table('legal_cases', function (Blueprint $table) {
            $afterColumn = Schema::hasColumn('legal_cases', 'failed_deal_reason')
                ? 'failed_deal_reason'
                : 'contra_indication_reason_id';

            $table->foreignId('failed_deal_reason_id')
                ->nullable()
                ->after($afterColumn)
                ->constrained('failed_deal_reasons')
                ->nullOnDelete();

            $table->timestamp('failed_deal_at')->nullable()->after('failed_deal_reason_id');

            $table->foreignId('failed_deal_by_user_id')
                ->nullable()
                ->after('failed_deal_at')
                ->constrained('users')
                ->nullOnDelete();
        });

        $now = now();
        $reasons = [
            'Não aceitação do valor proposto',
            'Sem interesse em qualquer tipo de acordo',
            'Sem contato com a parte',
        ];

        foreach ($reasons as $name) {
            DB::table('failed_deal_reasons')->insertOrIgnore([
                'name' => $name,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->dropForeign(['failed_deal_by_user_id']);
            $table->dropColumn('failed_deal_by_user_id');
            $table->dropColumn('failed_deal_at');
            $table->dropForeign(['failed_deal_reason_id']);
            $table->dropColumn('failed_deal_reason_id');
        });

        Schema::dropIfExists('failed_deal_reasons');
    }
};
