<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("
            ALTER TABLE legal_cases
            MODIFY COLUMN status ENUM(
                'initial_analysis',
                'indications',
                'contra_indicated',
                'proposal_sent',
                'in_negotiation',
                'awaiting_draft',
                'closed_deal',
                'failed_deal'
            ) NOT NULL DEFAULT 'initial_analysis'
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('legal_cases')
            ->where('status', 'indications')
            ->update(['status' => 'in_negotiation']);

        DB::statement("
            ALTER TABLE legal_cases
            MODIFY COLUMN status ENUM(
                'initial_analysis',
                'contra_indicated',
                'proposal_sent',
                'in_negotiation',
                'awaiting_draft',
                'closed_deal',
                'failed_deal'
            ) NOT NULL DEFAULT 'initial_analysis'
        ");
    }
};
