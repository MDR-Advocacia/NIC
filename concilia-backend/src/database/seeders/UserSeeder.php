<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Garante que a tabela esteja vazia antes de inserir
        // DB::table('users')->delete();

        DB::table('users')->insert([
            [
                //'id' => 1,
                'name' => 'Admin Sistema',
                'email' => 'admin@concilia.app',
                'password' => Hash::make('password'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                //'id' => 2,
                'name' => 'Advogado Teste 1',
                'email' => 'advogado1@concilia.app',
                'password' => Hash::make('password'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                //'id' => 3,
                'name' => 'Advogado Teste 2',
                'email' => 'advogado2@concilia.app',
                'password' => Hash::make('password'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}