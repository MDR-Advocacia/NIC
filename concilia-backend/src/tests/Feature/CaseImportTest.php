<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\LegalCase;
use App\Models\OpposingLawyer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CaseImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_updates_only_alcada_for_existing_cases(): void
    {
        $manager = User::factory()->create([
            'role' => 'administrador',
            'status' => 'ativo',
        ]);

        $operator = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
        ]);

        $client = Client::create([
            'name' => 'Cliente Importacao',
        ]);

        $opposingLawyer = OpposingLawyer::create([
            'name' => 'Advogado Adverso Correto',
        ]);

        $legalCase = LegalCase::create([
            'client_id' => $client->id,
            'user_id' => $operator->id,
            'case_number' => '08011957020268205004',
            'opposing_party' => 'Autor Correto',
            'defendant' => 'Reu Correto',
            'action_object' => 'Objeto correto',
            'status' => LegalCase::STATUS_INITIAL_ANALYSIS,
            'priority' => 'media',
            'original_value' => 1000,
            'cause_value' => 1000,
            'opposing_lawyer' => $opposingLawyer->name,
            'opposing_lawyer_id' => $opposingLawyer->id,
            'description' => 'Descricao correta',
        ]);

        Sanctum::actingAs($manager);

        $this->postJson('/api/cases/import', [
            'client_id' => $client->id,
            'cases' => [[
                'case_number' => $legalCase->case_number,
                'original_value' => '2500',
                'opposing_lawyer' => '',
                'opposing_party' => '',
                'defendant' => '',
            ]],
        ])->assertCreated()
            ->assertJsonPath('success_count', 1)
            ->assertJsonPath('created_count', 0)
            ->assertJsonPath('updated_count', 1);

        $legalCase->refresh();

        $this->assertSame(2500.0, (float) $legalCase->original_value);
        $this->assertTrue((bool) $legalCase->has_alcada);
        $this->assertSame($opposingLawyer->name, $legalCase->opposing_lawyer);
        $this->assertSame($opposingLawyer->id, $legalCase->opposing_lawyer_id);
        $this->assertSame('Autor Correto', $legalCase->opposing_party);
        $this->assertSame('Reu Correto', $legalCase->defendant);
        $this->assertSame('Descricao correta', $legalCase->description);
        $this->assertSame($operator->id, $legalCase->user_id);
    }
}
