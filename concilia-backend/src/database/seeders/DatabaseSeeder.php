<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            UserSeeder::class,        // 1. Cria Usuários (Admin)
            ClientSeeder::class,      // 2. Cria Clientes (Livelo/BB)
           // LegalCaseSeeder::class,   // 3. Cria Casos (Vincula Admin + Clientes)
            ConversationSeeder::class, // (Opcional, se tiver chat)
            //ChatMessageSeeder::class,  // (Opcional)
        ]);
    }
}