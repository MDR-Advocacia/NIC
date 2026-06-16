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
        $seeders = [
            UserSeeder::class,
            ClientSeeder::class,
        ];

        if (app()->environment('local')) {
            $seeders[] = ConversationSeeder::class;
        }

        $this->call($seeders);
    }
}
