<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE legal_cases MODIFY COLUMN status ENUM(
            'initial_analysis',
            'indications',
            'contra_indicated',
            'proposal_sent',
            'in_negotiation',
            'awaiting_draft',
            'closed_deal',
            'failed_deal',
            'closed_in_hearing',
            'pending_payment',
            'pending_obf',
            'pending_livelo_ourocap',
            'deal_completed'
        ) NOT NULL DEFAULT 'initial_analysis'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE legal_cases MODIFY COLUMN status ENUM(
            'initial_analysis',
            'indications',
            'contra_indicated',
            'proposal_sent',
            'in_negotiation',
            'awaiting_draft',
            'closed_deal',
            'failed_deal'
        ) NOT NULL DEFAULT 'initial_analysis'");
    }
};
