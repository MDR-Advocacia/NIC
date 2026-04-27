<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChatContactManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->setChatwootEnv('CHATWOOT_URL', 'https://chatwoot.test');
        $this->setChatwootEnv('CHATWOOT_API_TOKEN', 'chatwoot-token');
        $this->setChatwootEnv('CHATWOOT_ACCOUNT_ID', '1');
    }

    public function test_update_contact_can_toggle_blocked_status(): void
    {
        Sanctum::actingAs($this->makeAuthorizedUser());

        Http::fake([
            'https://chatwoot.test/api/v1/accounts/1/contacts/15' => Http::response(null, 204),
        ]);

        $this->putJson('/api/chat/contacts/15', [
            'blocked' => true,
        ])->assertStatus(204);

        Http::assertSent(function ($request) {
            return $request->method() === 'PUT'
                && $request->url() === 'https://chatwoot.test/api/v1/accounts/1/contacts/15'
                && $request['blocked'] === true;
        });
    }

    public function test_create_conversation_for_contact_uses_contactable_inboxes_when_source_id_is_missing(): void
    {
        Sanctum::actingAs($this->makeAuthorizedUser());

        Http::fake([
            'https://chatwoot.test/api/v1/accounts/1/contacts/88' => Http::response([
                'payload' => [
                    'id' => 88,
                    'name' => 'Contato sem source',
                    'contact_inboxes' => [],
                ],
            ], 200),
            'https://chatwoot.test/api/v1/accounts/1/contacts/88/contactable_inboxes' => Http::response([
                'payload' => [
                    [
                        'source_id' => 'source-abc',
                        'inbox' => [
                            'id' => 7,
                            'name' => 'Chat Principal',
                        ],
                    ],
                ],
            ], 200),
            'https://chatwoot.test/api/v1/accounts/1/conversations' => Http::response([
                'payload' => [
                    'id' => 321,
                    'inbox_id' => 7,
                ],
            ], 200),
        ]);

        $this->postJson('/api/chat/contacts/88/conversation', [
            'inbox_id' => 7,
        ])->assertOk()
            ->assertJsonPath('payload.id', 321);

        Http::assertSent(function ($request) {
            return $request->method() === 'POST'
                && $request->url() === 'https://chatwoot.test/api/v1/accounts/1/conversations'
                && $request['source_id'] === 'source-abc'
                && (int) $request['inbox_id'] === 7
                && (int) $request['contact_id'] === 88;
        });
    }

    public function test_create_conversation_for_contact_can_continue_without_source_id_when_chatwoot_accepts_contact_and_inbox(): void
    {
        Sanctum::actingAs($this->makeAuthorizedUser());

        Http::fake([
            'https://chatwoot.test/api/v1/accounts/1/contacts/91' => Http::response([
                'payload' => [
                    'id' => 91,
                    'name' => 'Contato sem sessao',
                    'contact_inboxes' => [],
                ],
            ], 200),
            'https://chatwoot.test/api/v1/accounts/1/contacts/91/contactable_inboxes' => Http::response([
                'payload' => [],
            ], 200),
            'https://chatwoot.test/api/v1/accounts/1/conversations' => Http::response([
                'payload' => [
                    'id' => 654,
                    'inbox_id' => 5,
                ],
            ], 200),
        ]);

        $this->postJson('/api/chat/contacts/91/conversation', [
            'inbox_id' => 5,
        ])->assertOk()
            ->assertJsonPath('payload.id', 654);

        Http::assertSent(function ($request) {
            return $request->method() === 'POST'
                && $request->url() === 'https://chatwoot.test/api/v1/accounts/1/conversations'
                && (int) $request['inbox_id'] === 5
                && (int) $request['contact_id'] === 91
                && !isset($request['source_id']);
        });
    }

    public function test_create_contact_returns_existing_candidates_when_chatwoot_rejects_the_creation(): void
    {
        Sanctum::actingAs($this->makeAuthorizedUser());

        Http::fake(function ($request) {
            if ($request->method() === 'POST' && $request->url() === 'https://chatwoot.test/api/v1/accounts/1/contacts') {
                return Http::response([
                    'errors' => ['phone_number' => ['Contato ja existe']],
                ], 422);
            }

            if ($request->method() === 'GET' && str_starts_with($request->url(), 'https://chatwoot.test/api/v1/accounts/1/contacts?search=')) {
                return Http::response([
                    'payload' => [
                        [
                            'id' => 44,
                            'name' => 'Murilo Ti',
                            'phone_number' => '+55 84 99999-0000',
                            'contact_inboxes' => [
                                [
                                    'inbox' => [
                                        'id' => 3,
                                        'name' => 'Chat Principal',
                                    ],
                                    'source_id' => 'source-44',
                                ],
                            ],
                        ],
                    ],
                ], 200);
            }

            return Http::response([], 404);
        });

        $this->postJson('/api/chat/contacts', [
            'name' => 'Murilo Ti',
            'phone_number' => '+55 84 99999-0000',
            'inbox_id' => 3,
        ])->assertUnprocessable()
            ->assertJsonPath('conflict_candidates.0.id', 44);
    }

    public function test_create_contact_omits_empty_optional_fields_when_proxying_to_chatwoot(): void
    {
        Sanctum::actingAs($this->makeAuthorizedUser());

        Http::fake([
            'https://chatwoot.test/api/v1/accounts/1/contacts' => Http::response([
                'payload' => [
                    'contact' => [
                        'id' => 71,
                        'name' => 'Contato Limpo',
                    ],
                ],
            ], 200),
        ]);

        $this->postJson('/api/chat/contacts', [
            'name' => 'Contato Limpo',
            'email' => '',
            'phone_number' => '',
            'inbox_id' => 9,
        ])->assertOk()
            ->assertJsonPath('payload.contact.id', 71);

        Http::assertSent(function ($request) {
            return $request->method() === 'POST'
                && $request->url() === 'https://chatwoot.test/api/v1/accounts/1/contacts'
                && $request['name'] === 'Contato Limpo'
                && (int) $request['inbox_id'] === 9
                && !isset($request['email'])
                && !isset($request['phone_number']);
        });
    }

    public function test_send_message_uses_inbox_provider_config_for_meta_template_fallback(): void
    {
        Sanctum::actingAs($this->makeAuthorizedUser());

        config([
            'services.meta_whatsapp.access_token' => 'meta-token',
            'services.meta_whatsapp.business_account_id' => null,
            'services.meta_whatsapp.phone_number_id' => null,
            'services.meta_whatsapp.business_account_id_map' => null,
            'services.meta_whatsapp.phone_number_id_map' => null,
            'services.meta_whatsapp.api_version' => 'v22.0',
        ]);

        Http::fake(function ($request) {
            if ($request->method() === 'POST' && $request->url() === 'https://chatwoot.test/api/v1/accounts/1/conversations/55/messages') {
                return Http::response([
                    'errors' => ['template' => ['Template indisponivel no Chatwoot']],
                ], 422);
            }

            if ($request->method() === 'GET' && $request->url() === 'https://chatwoot.test/api/v1/accounts/1/inboxes') {
                return Http::response([
                    'payload' => [
                        [
                            'id' => 7,
                            'channel' => [
                                'provider_config' => [
                                    'business_account_id' => 'waba-7',
                                    'phone_number_id' => 'phone-7',
                                ],
                            ],
                        ],
                    ],
                ], 200);
            }

            if ($request->method() === 'POST' && $request->url() === 'https://graph.facebook.com/v22.0/phone-7/messages') {
                return Http::response([
                    'messages' => [
                        ['id' => 'wamid-123'],
                    ],
                ], 200);
            }

            return Http::response([], 404);
        });

        $this->postJson('/api/chat/conversations/55/messages', [
            'content' => 'Bom dia, Murilo.',
            'content_type' => 'template',
            'content_attributes' => [
                'template_name' => 'bom_dia',
                'language_code' => 'pt_BR',
            ],
            'template_params' => [
                'name' => 'bom_dia',
                'language' => 'pt_BR',
                'processed_params' => [
                    'body' => [
                        '1' => 'Murilo',
                    ],
                ],
            ],
            'to_phone_number' => '+5584999990000',
            'inbox_id' => 7,
        ])->assertOk()
            ->assertJsonPath('meta_fallback', true)
            ->assertJsonPath('id', 'wamid-123');

        Http::assertSent(function ($request) {
            return $request->method() === 'POST'
                && $request->url() === 'https://graph.facebook.com/v22.0/phone-7/messages'
                && $request['template']['name'] === 'bom_dia'
                && $request['to'] === '5584999990000';
        });
    }

    public function test_destroy_contact_proxies_the_delete_request(): void
    {
        Sanctum::actingAs($this->makeAuthorizedUser());

        Http::fake([
            'https://chatwoot.test/api/v1/accounts/1/contacts/90' => Http::response([
                'success' => true,
            ], 200),
        ]);

        $this->deleteJson('/api/chat/contacts/90')
            ->assertOk()
            ->assertJsonPath('success', true);

        Http::assertSent(function ($request) {
            return $request->method() === 'DELETE'
                && $request->url() === 'https://chatwoot.test/api/v1/accounts/1/contacts/90';
        });
    }

    private function makeAuthorizedUser(): User
    {
        return User::factory()->create([
            'role' => 'administrador',
            'status' => 'ativo',
        ]);
    }

    private function setChatwootEnv(string $key, string $value): void
    {
        putenv("{$key}={$value}");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}
