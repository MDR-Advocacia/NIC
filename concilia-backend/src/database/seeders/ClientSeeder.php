<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Client;

class ClientSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Lista apenas com os bancos que você quer
        $clients = [
            [
                'name' => 'Banco do Brasil S.A.', // Necessário para testar Ourocap
                'email' => 'contato@bb.com.br',
                'phone' => '0800 729 0001',
                'status' => 'ativo',
            ],
            [
                'name' => 'Livelo S.A.',          // Necessário para testar Pontos
                'email' => 'juridico@livelo.com.br',
                'phone' => '0800 000 0000',
                'status' => 'ativo',
            ],
        ];

        foreach ($clients as $clientData) {
            Client::create($clientData);
        }
    }
}