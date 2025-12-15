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
                'role' => 'administrador', 
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
            // USUÁRIO 4: Outro Advogado
            [
                'name' => 'Advogado Teste 3',
                'email' => 'advogado3@concilia.app',
                'password'=> Hash::make('password'),
                'role' => 'operador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // USUÁRIO 5: Outro Advogado
            [
                'name' => 'Advogado Teste 4',
                'email' => 'advogado4@concilia.app',
                'password' => Hash::make('password'),
                'role' => 'operador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // USUÁRIO 6: Outro Advogado
            [
                'name' => 'Advogado Teste 5',
                'email' => 'advogado5@concilia.app',
                'password' => Hash::make('password'),
                'role' => 'operador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // USUÁRIO 7: Outro Advogado
            [
                'name' => 'Advogado Teste 6',
                'email' => 'advogado6@concilia.app',
                'password' => Hash::make('password'),
                'role' => 'operador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // USUÁRIO 7: Outro Advogado
            [
                'name' => 'Advogado Teste 7',
                'email' => 'advogado7@concilia.app',
                'password' => Hash::make('password'),
                'role' => 'operador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // USUÁRIO 7: Outro Advogado
            [
                'name' => 'Advogado Teste 8',
                'email' => 'advogado8@concilia.app',
                'password' => Hash::make('password'),
                'role' => 'operador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // USUÁRIO 7: Outro Advogado
            [
                'name' => 'Advogado Teste 9',
                'email' => 'advogado9@concilia.app',
                'password' => Hash::make('password'),
                'role' => 'operador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // USUÁRIO 7: Outro Advogado
            [
                'name' => 'Advogado Teste 10',
                'email' => 'advogado10@concilia.app',
                'password' => Hash::make('password'),
                'role' => 'operador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // USUÁRIO 7: Outro Advogado
            [
                'name' => 'Advogado Teste 11',
                'email' => 'advogado11@concilia.app',
                'password' => Hash::make('password'),
                'role' => 'operador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // USUÁRIO 7: Outro Advogado
            [
                'name' => 'Advogado Teste 12',
                'email' => 'advogado12@concilia.app',
                'password' => Hash::make('password'),
                'role' => 'operador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // USUÁRIO 7: Outro Advogado
            [
                'name' => 'Advogado Teste 13',
                'email' => 'advogado13@concilia.app',
                'password' => Hash::make('password'),
                'role' => 'operador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // USUÁRIO 7: Outro Advogado
            [
                'name' => 'Advogado Teste 14',
                'email' => 'advogado14@concilia.app',
                'password' => Hash::make('password'),
                'role' => 'operador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // USUÁRIO 7: Outro Advogado
            [
                'name' => 'Advogado Teste 15',
                'email' => 'advogado15@concilia.app',
                'password' => Hash::make('password'),
                'role' => 'operador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // USUÁRIO 7: Outro Advogado
            [
                'name' => 'Advogado Teste 16',
                'email' => 'advogado16@concilia.app',
                'password' => Hash::make('password'),
                'role' => 'operador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // USUÁRIO 7: Outro Advogado
            [
                'name' => 'Advogado Teste 17',
                'email' => 'advogado17@concilia.app',
                'password' => Hash::make('password'),
                'role' => 'operador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}