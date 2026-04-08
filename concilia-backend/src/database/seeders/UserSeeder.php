<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('users')->updateOrInsert(
            ['email' => 'admin@concilia.app'],
            [
                'name' => 'Admin Sistema',
                'password' => Hash::make('password'),
                'role' => 'administrador',
                'status' => 'ativo',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
