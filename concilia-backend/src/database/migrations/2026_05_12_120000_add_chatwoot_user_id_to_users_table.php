<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'chatwoot_user_id')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('chatwoot_user_id')->nullable()->after('chatwoot_access_token');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('users', 'chatwoot_user_id')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('chatwoot_user_id');
        });
    }
};
