<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\LegalCase;
use App\Models\Client;
use App\Models\User;

class LegalCaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::first();
        $clients = Client::all();

        if (!$admin || $clients->isEmpty()) {
            return;
        }

        foreach ($clients as $client) {
            LegalCase::factory()
                ->count(5)
                ->create([
                    'client_id' => $client->id,
                    'user_id' => $admin->id,
                    
                    // CORREÇÃO AQUI: Mudamos de 'ativo' para 'in_negotiation'
                    'status' => 'in_negotiation', 
                ]);
        }
    }
}