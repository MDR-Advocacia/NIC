<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('chatwoot_access_token')->nullable()->after('must_change_password');
            $table->unsignedBigInteger('chatwoot_agent_id')->nullable()->after('chatwoot_access_token');
            $table->string('chatwoot_agent_name')->nullable()->after('chatwoot_agent_id');
            $table->string('chatwoot_agent_email')->nullable()->after('chatwoot_agent_name');
            $table->unsignedBigInteger('chatwoot_account_id')->nullable()->after('chatwoot_agent_email');
            $table->string('chatwoot_role')->nullable()->after('chatwoot_account_id');
            $table->timestamp('chatwoot_connected_at')->nullable()->after('chatwoot_role');
            $table->timestamp('chatwoot_last_validated_at')->nullable()->after('chatwoot_connected_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'chatwoot_access_token',
                'chatwoot_agent_id',
                'chatwoot_agent_name',
                'chatwoot_agent_email',
                'chatwoot_account_id',
                'chatwoot_role',
                'chatwoot_connected_at',
                'chatwoot_last_validated_at',
            ]);
        });
    }
};
