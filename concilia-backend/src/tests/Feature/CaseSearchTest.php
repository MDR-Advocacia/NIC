<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\LegalCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CaseSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_case_management_search_accepts_multiple_pasted_case_numbers(): void
    {
        $viewer = User::factory()->create([
            'role' => 'administrador',
            'status' => 'ativo',
        ]);

        Sanctum::actingAs($viewer);

        $firstCase = $this->createLegalCase('08011957020268205004');
        $secondCase = $this->createLegalCase('06014605620248045300');
        $this->createLegalCase('99999999920248045300');

        $search = "\"{$firstCase->case_number}\n{$secondCase->case_number}\"";

        $response = $this->getJson('/api/cases?search=' . rawurlencode($search));

        $response->assertOk();
        $this->assertSame(2, (int) $response->json('total'));
        $this->assertEqualsCanonicalizing(
            [$firstCase->case_number, $secondCase->case_number],
            array_column($response->json('data') ?? [], 'case_number')
        );
    }

    public function test_case_management_search_returns_specific_feedback_for_missing_case_number_lists(): void
    {
        $viewer = User::factory()->create([
            'role' => 'administrador',
            'status' => 'ativo',
        ]);

        Sanctum::actingAs($viewer);

        $this->createLegalCase('08011957020268205004');

        $search = "08000000020268205004\n08000000120268205004";

        $response = $this->getJson('/api/cases?search=' . rawurlencode($search));

        $response
            ->assertOk()
            ->assertJsonPath('total', 0)
            ->assertJsonPath('search_feedback.type', 'case_number_list_not_found')
            ->assertJsonPath('search_feedback.total_terms', 2);
    }

    public function test_cases_filter_can_return_unassigned_responsible_cases(): void
    {
        $viewer = User::factory()->create([
            'role' => 'administrador',
            'status' => 'ativo',
        ]);

        Sanctum::actingAs($viewer);

        $assignedCase = $this->createLegalCase('08011957020268205004');
        $unassignedCase = $this->createLegalCase('06014605620248045300', [
            'user_id' => null,
        ]);

        $response = $this->getJson('/api/cases?lawyer_id=__unassigned__');

        $response->assertOk()
            ->assertJsonPath('total', 1);

        $this->assertSame(
            [$unassignedCase->case_number],
            array_column($response->json('data') ?? [], 'case_number')
        );

        $this->assertNotSame($assignedCase->case_number, $unassignedCase->case_number);
    }

    private function createLegalCase(string $caseNumber, array $overrides = []): LegalCase
    {
        $client = Client::firstOrCreate([
            'name' => 'Cliente de Teste',
        ]);

        $responsibleUser = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
        ]);

        return LegalCase::create(array_merge([
            'client_id' => $client->id,
            'user_id' => $responsibleUser->id,
            'case_number' => $caseNumber,
            'opposing_party' => 'Parte adversa',
            'defendant' => 'Parte re',
            'action_object' => 'Teste',
            'status' => LegalCase::STATUS_INITIAL_ANALYSIS,
            'priority' => 'media',
            'original_value' => 1000,
            'cause_value' => 1000,
        ], $overrides));
    }
}
