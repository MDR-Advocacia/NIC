<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('legal_cases')) {
            return;
        }

        $hasOurocapValue = Schema::hasColumn('legal_cases', 'ourocap_value');
        $hasLiveloPoints = Schema::hasColumn('legal_cases', 'livelo_points');

        Schema::table('legal_cases', function (Blueprint $table) use ($hasOurocapValue, $hasLiveloPoints) {
            if (!$hasOurocapValue) {
                $table->decimal('ourocap_value', 12, 2)->nullable()->after('agreement_value');
            }

            if (!$hasLiveloPoints) {
                $table->unsignedInteger('livelo_points')->nullable()->after('ourocap_value');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('legal_cases')) {
            return;
        }

        if (Schema::hasColumn('legal_cases', 'livelo_points')) {
            Schema::table('legal_cases', function (Blueprint $table) {
                $table->dropColumn('livelo_points');
            });
        }

        if (Schema::hasColumn('legal_cases', 'ourocap_value')) {
            Schema::table('legal_cases', function (Blueprint $table) {
                $table->dropColumn('ourocap_value');
            });
        }
    }
};
