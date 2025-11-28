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
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->string('action_object')->nullable()->after('description');
            $table->string('defendant')->nullable()->after('opposing_party');
            $table->string('comarca')->nullable()->after('priority');
            $table->string('state', 2)->nullable()->after('comarca');
            $table->string('special_court')->default('Não')->after('state');
            $table->string('opposing_lawyer')->nullable()->after('special_court');
            $table->string('opposing_contact')->nullable()->after('opposing_lawyer');
            $table->json('tags')->nullable()->after('opposing_contact');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->dropColumn([
                'action_object', 'defendant', 'comarca', 'state', 'special_court',
                'opposing_lawyer', 'opposing_contact', 'tags'
            ]);
        });
    }
};
