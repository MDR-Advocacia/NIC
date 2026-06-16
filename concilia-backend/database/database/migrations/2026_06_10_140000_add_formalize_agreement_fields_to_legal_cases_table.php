<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->date('hearing_date')->nullable()->after('agreement_closed_at');
            $table->string('formalized_by_name')->nullable()->after('hearing_date');
            $table->boolean('has_obligation')->default(false)->after('formalized_by_name');
            $table->text('obligation_description')->nullable()->after('has_obligation');
            $table->unsignedBigInteger('formalized_by_user_id')->nullable()->after('obligation_description');
            $table->timestamp('formalized_at')->nullable()->after('formalized_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->dropColumn([
                'hearing_date',
                'formalized_by_name',
                'has_obligation',
                'obligation_description',
                'formalized_by_user_id',
                'formalized_at',
            ]);
        });
    }
};
