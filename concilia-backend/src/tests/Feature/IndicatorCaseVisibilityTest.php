<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\LegalCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IndicatorCaseVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_indicator_can_see_all_pipeline_cards(): void
    {
        $indicator = User::factory()->create([
            'role' => 'indicador',
            'status' => 'ativo',
        ]);

        $otherIndicator = User::factory()->create([
            'role' => 'indicador',
            'status' => 'ativo',
        ]);

        $operator = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
        ]);

        $pipelineCase = $this->createLegalCase($operator, [
            'case_number' => '08033333320268205004',
            'indicator_user_id' => $otherIndicator->id,
            'status' => LegalCase::STATUS_IN_NEGOTIATION,
            'original_value' => 1000,
        ]);

        $generalBaseCase = $this->createLegalCase($operator, [
            'case_number' => '08044444420268205004',
            'status' => LegalCase::STATUS_IN_NEGOTIATION,
            'original_value' => 0,
        ]);

        Sanctum::actingAs($indicator);

        $this->getJson('/api/cases')
            ->assertOk()
            ->assertJsonFragment(['case_number' => $pipelineCase->case_number])
            ->assertJsonMissing(['case_number' => $generalBaseCase->case_number]);

        $this->getJson("/api/cases/{$pipelineCase->id}")
            ->assertOk()
            ->assertJsonPath('id', $pipelineCase->id);
    }

    private function createLegalCase(User $operator, array $overrides = []): LegalCase
    {
        $client = Client::firstOrCreate([
            'name' => 'Cliente Visibilidade Indicador',
        ]);

        return LegalCase::create(array_merge([
            'client_id' => $client->id,
            'user_id' => $operator->id,
            'case_number' => '08000000020268205004',
            'opposing_party' => 'Parte adversa',
            'defendant' => 'Parte re',
            'action_object' => 'Teste visibilidade indicador',
            'status' => LegalCase::STATUS_INITIAL_ANALYSIS,
            'priority' => 'media',
            'original_value' => 1000,
            'cause_value' => 1000,
        ], $overrides));
    }
}
