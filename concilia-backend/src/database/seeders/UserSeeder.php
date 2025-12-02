<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('users')->insert([
            // USUÁRIO 1: O ADMIN (Obrigatório ser 'admin')
            [
                'name' => 'Admin Sistema',
                'email' => 'admin@concilia.app',
                'password' => Hash::make('password'),
                'role' => 'admin', 
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // USUÁRIO 2: Advogado (Operador)
            [
                'name' => 'Advogado Teste 1',
                'email' => 'advogado1@concilia.app',
                'password' => Hash::make('password'),
                'role' => 'operador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // USUÁRIO 3: Outro Advogado
            [
                'name' => 'Advogado Teste 2',
                'email' => 'advogado2@concilia.app',
                'password' => Hash::make('password'),
                'role' => 'operador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}