<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ChatMessage;
use Illuminate\Support\Facades\DB;

class ChatMessageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Usamos truncate aqui porque chat_messages não tem outras tabelas dependendo dela.
        // É seguro limpar antes de popular.
        DB::table('chat_messages')->truncate();

        // Mensagens para a Conversa 1 (Maria Clara)
        ChatMessage::create([
            'conversation_id' => 1,
            'content' => 'Boa tarde, recebi uma notificação sobre meu processo e gostaria de saber mais...',
            'message_type' => 0, // 0 = incoming (recebida pelo cliente)
            'created_at' => now()->subMinutes(10),
        ]);
        ChatMessage::create([
            'conversation_id' => 1,
            'content' => 'Olá Maria, claro! Para qual processo seria?',
            'message_type' => 1, // 1 = outgoing (enviada por você)
            'created_at' => now()->subMinutes(9),
        ]);

        // Mensagens para a Conversa 2 (João Pedro)
        ChatMessage::create([
            'conversation_id' => 2,
            'content' => 'Olá, qual o status do processo 0012345-67.2024.8.20.0001?',
            'message_type' => 0,
            'created_at' => now()->subMinutes(5),
        ]);

        // Mensagens para a Conversa 3 (Cliente Anônimo)
        ChatMessage::create([
            'conversation_id' => 3,
            'content' => 'Quero negociar.',
            'message_type' => 0,
            'created_at' => now()->subMinutes(2),
        ]);
        ChatMessage::create([
            'conversation_id' => 3,
            'content' => 'Bom dia! Para iniciarmos a negociação, por favor, informe o número do seu processo ou seu CPF.',
            'message_type' => 1,
            'created_at' => now()->subMinutes(1),
        ]);
    }
}