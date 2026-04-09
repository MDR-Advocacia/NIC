<?php

namespace Tests\Feature;

use App\Models\CaseTag;
use App\Models\Client;
use App\Models\LegalCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CaseTagManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrator_can_delete_a_saved_tag_and_remove_it_from_cases(): void
    {
        $administrator = User::factory()->create([
            'role' => 'administrador',
            'status' => 'ativo',
        ]);

        $operator = User::factory()->create([
            'role' => 'operador',
            'status' => 'ativo',
        ]);

        Sanctum::actingAs($administrator);

        $caseTag = CaseTag::create([
            'name' => 'Urgente BB',
            'color' => '#EF4444',
        ]);

        $firstCase = $this->createLegalCase($operator, 'TAG-DELETE-001', [
            ['text' => 'Urgente BB', 'color' => '#EF4444'],
            ['text' => 'VIP', 'color' => '#0EA5E9'],
        ]);

        $secondCase = $this->createLegalCase($operator, 'TAG-DELETE-002', [
            ['text' => 'Urgente BB', 'color' => '#EF4444'],
        ]);

        $response = $this->deleteJson('/api/case-tags/' . $caseTag->id);

        $response
            ->assertOk()
            ->assertJsonPath('removed_from_cases', 2);

        $this->assertDatabaseMissing('case_tags', ['id' => $caseTag->id]);
        $this->assertSame(['VIP'], array_map(
            static fn (array $tag) => $tag['text'],
            $firstCase->fresh()->tags ?? []
        ));
        $this->assertSame([], $secondCase->fresh()->tags ?? []);
    }

    public function test_non_administrator_cannot_delete_a_saved_tag(): void
    {
        $supervisor = User::factory()->create([
            'role' => 'supervisor',
            'status' => 'ativo',
        ]);

        Sanctum::actingAs($supervisor);

        $caseTag = CaseTag::create([
            'name' => 'Somente Admin',
            'color' => '#22C55E',
        ]);

        $this->deleteJson('/api/case-tags/' . $caseTag->id)
            ->assertForbidden()
            ->assertJsonPath('message', 'Apenas administradores podem excluir etiquetas.');

        $this->assertDatabaseHas('case_tags', ['id' => $caseTag->id]);
    }

    private function createLegalCase(User $operator, string $caseNumber, array $tags): LegalCase
    {
        $client = Client::firstOrCreate([
            'name' => 'Cliente Etiquetas',
        ]);

        return LegalCase::create([
            'client_id' => $client->id,
            'user_id' => $operator->id,
            'case_number' => $caseNumber,
            'opposing_party' => 'Parte autora',
            'defendant' => 'Parte re',
            'action_object' => 'Teste de etiquetas',
            'status' => LegalCase::STATUS_INITIAL_ANALYSIS,
            'priority' => 'media',
            'original_value' => 1000,
            'cause_value' => 1000,
            'tags' => $tags,
        ]);
    }
}
