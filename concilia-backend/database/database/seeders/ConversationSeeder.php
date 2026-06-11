<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Conversation; // Importe o seu modelo Conversation

class ConversationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // A linha DB::table('conversations')->truncate(); foi REMOVIDA daqui.

        Conversation::create([
            'contact_name' => 'Maria Clara',
            'contact_phone' => '+5584998765432',
            'last_message' => 'Boa tarde, recebi uma notificação sobre meu processo e gostaria de saber mais...',
            'timestamp' => now()->timestamp,
            'legal_case_id' => null, // Garante que não está vinculada
        ]);

        Conversation::create([
            'contact_name' => 'João Pedro',
            'contact_phone' => '+5584991234567',
            'last_message' => 'Olá, qual o status do processo 0012345-67.2024.8.20.0001?',
            'timestamp' => now()->subHour()->timestamp,
            'legal_case_id' => null, // Garante que não está vinculada
        ]);

        Conversation::create([
            'contact_name' => 'Cliente Anônimo',
            'contact_phone' => '+5584988887777',
            'last_message' => 'Quero negociar.',
            'timestamp' => now()->subHours(2)->timestamp,
            'legal_case_id' => null, // Garante que não está vinculada
        ]);
    }
}