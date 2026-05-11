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

    public function test_chatwoot_routes_return_configuration_error_before_proxying_without_credentials(): void
    {
        Sanctum::actingAs($this->makeAuthorizedUser());

        config([
            'app.chatwoot_url' => null,
            'app.chatwoot_api_token' => null,
            'app.chatwoot_account_id' => null,
        ]);

        Http::fake();

        $this->getJson('/api/chat/contacts')
            ->assertStatus(503)
            ->assertJsonPath('message', 'Integracao com Chatwoot nao configurada no backend.')
            ->assertJsonPath('missing.0', 'CHATWOOT_URL')
            ->assertJsonPath('missing.1', 'CHATWOOT_ACCOUNT_ID');

        Http::assertNothingSent();
    }

    public function test_chatwoot_routes_require_connected_user_account_before_proxying(): void
    {
        Sanctum::actingAs($this->makeAuthorizedUser([
            'chatwoot_access_token' => null,
            'chatwoot_agent_id' => null,
        ]));

        Http::fake();

        $this->getJson('/api/chat/contacts')
            ->assertStatus(409)
            ->assertJsonPath('message', 'Conecte sua conta pessoal do Chatwoot no perfil antes de usar a Caixa de Entrada.');

        Http::assertNothingSent();
    }

    public function test_user_can_connect_chatwoot_account_with_matching_profile(): void
    {
        $user = $this->makeAuthorizedUser([
            'chatwoot_access_token' => null,
            'chatwoot_agent_id' => null,
        ]);

        Sanctum::actingAs($user);

        Http::fake([
            'https://chatwoot.test/api/v1/profile' => Http::response([
                'id' => 321,
                'available_name' => 'Agente NIC',
                'email' => $user->email,
                'accounts' => [
                    [
                        'id' => 1,
                        'role' => 'agent',
                    ],
                ],
            ], 200),
        ]);

        $this->putJson('/api/chat/connection', [
            'chatwoot_access_token' => 'personal-token-321',
        ])->assertOk()
            ->assertJsonPath('connection.connected', true)
            ->assertJsonPath('connection.agent.id', 321)
            ->assertJsonPath('connection.agent.email', $user->email);

        $user->refresh();

        $this->assertTrue($user->chatwoot_connected);
        $this->assertSame('personal-token-321', $user->chatwoot_access_token);
        $this->assertSame(321, (int) $user->chatwoot_agent_id);

        Http::assertSent(function ($request) {
            return $request->method() === 'GET'
                && $request->url() === 'https://chatwoot.test/api/v1/profile'
                && $this->requestHasChatwootToken($request, 'personal-token-321');
        });
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
                && $this->requestHasChatwootToken($request)
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
            'https://chatwoot.test/api/v1/accounts/1/conversations?status=open&assignee_type=all&inbox_id=7' => Http::response([
                'payload' => [],
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

    public function test_create_conversation_for_contact_creates_contact_inbox_from_phone_when_source_id_is_missing(): void
    {
        Sanctum::actingAs($this->makeAuthorizedUser());

        Http::fake([
            'https://chatwoot.test/api/v1/accounts/1/contacts/91' => Http::response([
                'payload' => [
                    'id' => 91,
                    'name' => 'Contato sem source',
                    'phone_number' => '(84) 99999-0000',
                    'contact_inboxes' => [],
                ],
            ], 200),
            'https://chatwoot.test/api/v1/accounts/1/contacts/91/contactable_inboxes' => Http::response([
                'payload' => [],
            ], 200),
            'https://chatwoot.test/api/v1/accounts/1/contacts/91/contact_inboxes' => Http::response([
                'source_id' => '+5584999990000',
                'inbox' => [
                    'id' => 5,
                    'name' => 'WhatsApp',
                ],
            ], 200),
            'https://chatwoot.test/api/v1/accounts/1/conversations?status=open&assignee_type=all&inbox_id=5' => Http::response([
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
                && $request->url() === 'https://chatwoot.test/api/v1/accounts/1/contacts/91/contact_inboxes'
                && $this->requestHasChatwootToken($request)
                && (int) $request['inbox_id'] === 5
                && $request['source_id'] === '+5584999990000';
        });

        Http::assertSent(function ($request) {
            return $request->method() === 'POST'
                && $request->url() === 'https://chatwoot.test/api/v1/accounts/1/conversations'
                && (int) $request['inbox_id'] === 5
                && (int) $request['contact_id'] === 91
                && $request['source_id'] === '+5584999990000';
        });

        $this->assertEveryChatwootRequestUsedUserToken();
    }

    public function test_create_contact_reuses_existing_candidate_when_chatwoot_rejects_the_creation(): void
    {
        Sanctum::actingAs($this->makeAuthorizedUser());

        Http::fake(function ($request) {
            if ($request->method() === 'POST' && $request->url() === 'https://chatwoot.test/api/v1/accounts/1/contacts') {
                return Http::response([
                    'errors' => ['phone_number' => ['Contato ja existe']],
                ], 422);
            }

            if ($request->method() === 'GET' && str_starts_with($request->url(), 'https://chatwoot.test/api/v1/accounts/1/contacts/search?q=')) {
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
        ])->assertOk()
            ->assertJsonPath('reused_existing', true)
            ->assertJsonPath('payload.contact.id', 44)
            ->assertJsonPath('conflict_candidates.0.id', 44);
    }

    public function test_create_contact_reuses_existing_candidate_when_phone_is_in_additional_attributes(): void
    {
        Sanctum::actingAs($this->makeAuthorizedUser());

        Http::fake(function ($request) {
            if ($request->method() === 'POST' && $request->url() === 'https://chatwoot.test/api/v1/accounts/1/contacts') {
                return Http::response([
                    'message' => 'Validation failed: Phone number has already been taken',
                ], 422);
            }

            if ($request->method() === 'GET' && str_starts_with($request->url(), 'https://chatwoot.test/api/v1/accounts/1/contacts/search?q=')) {
                return Http::response([
                    'payload' => [
                        [
                            'id' => 45,
                            'name' => 'Contato WhatsApp',
                            'phone_number' => null,
                            'identifier' => null,
                            'additional_attributes' => [
                                'phone_number' => '+5584999990000',
                            ],
                            'contact_inboxes' => [
                                [
                                    'inbox' => [
                                        'id' => 3,
                                        'name' => 'Chat Principal',
                                    ],
                                    'source_id' => '+5584999990000',
                                ],
                            ],
                        ],
                    ],
                ], 200);
            }

            return Http::response([], 404);
        });

        $this->postJson('/api/chat/contacts', [
            'name' => 'Contato WhatsApp',
            'phone_number' => '(84) 99999-0000',
            'inbox_id' => 3,
        ])->assertOk()
            ->assertJsonPath('reused_existing', true)
            ->assertJsonPath('payload.contact.id', 45);
    }

    public function test_create_contact_scans_contact_pages_when_duplicate_phone_search_returns_no_match(): void
    {
        Sanctum::actingAs($this->makeAuthorizedUser());

        Http::fake(function ($request) {
            if ($request->method() === 'POST' && $request->url() === 'https://chatwoot.test/api/v1/accounts/1/contacts') {
                return Http::response([
                    'message' => 'Phone number has already been taken',
                ], 422);
            }

            if ($request->method() === 'GET' && str_contains($request->url(), '/contacts/search?')) {
                return Http::response(['payload' => []], 200);
            }

            if ($request->method() === 'GET' && str_contains($request->url(), '/contacts?search=')) {
                return Http::response(['payload' => []], 200);
            }

            if ($request->method() === 'POST' && str_ends_with($request->url(), '/contacts/filter')) {
                return Http::response(['payload' => []], 200);
            }

            if ($request->method() === 'GET' && $request->url() === 'https://chatwoot.test/api/v1/accounts/1/contacts?page=1') {
                return Http::response([
                    'payload' => [
                        [
                            'id' => 46,
                            'name' => 'Contato Paginado',
                            'phone_number' => '+5584999990000',
                        ],
                    ],
                ], 200);
            }

            if ($request->method() === 'GET' && $request->url() === 'https://chatwoot.test/api/v1/accounts/1/contacts?page=2') {
                return Http::response(['payload' => []], 200);
            }

            return Http::response([], 404);
        });

        $this->postJson('/api/chat/contacts', [
            'name' => 'Contato Paginado',
            'phone_number' => '(84) 99999-0000',
            'inbox_id' => 3,
        ])->assertOk()
            ->assertJsonPath('reused_existing', true)
            ->assertJsonPath('payload.contact.id', 46);
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

    public function test_create_contact_normalizes_brazilian_phone_before_proxying_to_chatwoot(): void
    {
        Sanctum::actingAs($this->makeAuthorizedUser());

        Http::fake([
            'https://chatwoot.test/api/v1/accounts/1/contacts' => Http::response([
                'payload' => [
                    'contact' => [
                        'id' => 72,
                        'name' => 'Contato BR',
                        'phone_number' => '+5584999990000',
                    ],
                ],
            ], 200),
        ]);

        $this->postJson('/api/chat/contacts', [
            'name' => 'Contato BR',
            'phone_number' => '(84) 99999-0000',
            'inbox_id' => 9,
        ])->assertOk()
            ->assertJsonPath('payload.contact.id', 72);

        Http::assertSent(function ($request) {
            return $request->method() === 'POST'
                && $request->url() === 'https://chatwoot.test/api/v1/accounts/1/contacts'
                && $request['phone_number'] === '+5584999990000';
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

    private function makeAuthorizedUser(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'role' => 'administrador',
            'status' => 'ativo',
            'chatwoot_access_token' => 'chatwoot-agent-token',
            'chatwoot_agent_id' => 777,
            'chatwoot_agent_name' => 'Agente NIC',
            'chatwoot_agent_email' => 'agente@nic.test',
            'chatwoot_account_id' => 1,
            'chatwoot_role' => 'agent',
            'chatwoot_connected_at' => now(),
            'chatwoot_last_validated_at' => now(),
        ], $overrides));
    }

    private function requestHasChatwootToken($request, string $token = 'chatwoot-agent-token'): bool
    {
        return in_array($token, $request->header('api_access_token') ?? [], true);
    }

    private function assertEveryChatwootRequestUsedUserToken(string $token = 'chatwoot-agent-token'): void
    {
        Http::recorded()->each(function ($record) use ($token) {
            [$request] = $record;

            if (!str_starts_with($request->url(), 'https://chatwoot.test/')) {
                return;
            }

            $this->assertTrue(
                $this->requestHasChatwootToken($request, $token),
                "Chatwoot request {$request->method()} {$request->url()} did not use the connected user's token."
            );
        });
    }

    private function setChatwootEnv(string $key, string $value): void
    {
        putenv("{$key}={$value}");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;

        config([
            match ($key) {
                'CHATWOOT_URL' => 'app.chatwoot_url',
                'CHATWOOT_API_TOKEN' => 'app.chatwoot_api_token',
                'CHATWOOT_ACCOUNT_ID' => 'app.chatwoot_account_id',
            } => $value,
        ]);
    }
}
