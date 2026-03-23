<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\LegalCase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    private $chatwootUrl;
    private $apiToken;
    private $accountId;
    private $metaAccessToken;
    private $metaBusinessAccountId;
    private $metaPhoneNumberId;
    private $metaBusinessAccountIdMap;
    private $metaPhoneNumberIdMap;
    private $metaApiVersion;

    public function __construct()
    {
        $this->chatwootUrl = env('CHATWOOT_URL');
        $this->apiToken = env('CHATWOOT_API_TOKEN');
        $this->accountId = env('CHATWOOT_ACCOUNT_ID');
        $this->metaAccessToken = config('services.meta_whatsapp.access_token');
        $this->metaBusinessAccountId = config('services.meta_whatsapp.business_account_id');
        $this->metaPhoneNumberId = config('services.meta_whatsapp.phone_number_id');
        $this->metaBusinessAccountIdMap = $this->parseEnvMap(config('services.meta_whatsapp.business_account_id_map'));
        $this->metaPhoneNumberIdMap = $this->parseEnvMap(config('services.meta_whatsapp.phone_number_id_map'));
        $this->metaApiVersion = config('services.meta_whatsapp.api_version', 'v22.0');
    }

    public function getContacts(Request $request)
    {
        $search = $request->query('search');

        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts", [
                'search' => $search,
            ]);

        return response()->json($response->json());
    }

    public function resolveConversation($conversationId)
    {
        $response = Http::withHeaders([
            'api_access_token' => $this->apiToken,
        ])->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}/toggle_status", [
            'status' => 'resolved',
        ]);

        return response()->json($response->json());
    }

    public function createContact(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'email' => 'nullable|email',
            'phone_number' => 'nullable|string',
            'inbox_id' => 'required|integer',
        ]);

        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts", $validated);

        return response()->json($response->json());
    }

    public function getConversations(Request $request)
    {
        $status = $request->query('status', 'open');
        $assigneeType = $request->query('assignee_type', 'all');
        $queryParams = ['status' => $status];

        if ($assigneeType !== 'all') {
            $queryParams['assignee_type'] = $assigneeType;
        }

        try {
            $response = Http::withHeaders(['api_access_token' => $this->apiToken])
                ->timeout(10)
                ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations", $queryParams);

            if ($response->failed()) {
                return response()->json(['error' => 'Erro na API'], 502);
            }

            $data = $response->json();

            return response()->json($data['payload'] ?? $data);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Timeout'], 504);
        }
    }

    public function getInboxes()
    {
        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/inboxes");

        $data = $response->json();

        return response()->json($data['payload'] ?? $data);
    }

    public function getMyInboxes(Request $request)
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->apiToken,
            ])
                ->timeout(5)
                ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/inboxes");

            return response()->json($response->json());
        } catch (\Exception $e) {
            return response()->json(['error' => 'Erro ao carregar canais'], 500);
        }
    }

    public function linkConversation(Request $request, $conversationId)
    {
        $validated = $request->validate([
            'legal_case_id' => 'required|integer|exists:legal_cases,id',
        ]);

        $conversation = Conversation::find($conversationId);

        if ($conversation) {
            $conversation->legal_case_id = $validated['legal_case_id'];
            $conversation->save();
        }

        return response()->json(['message' => 'Vinculacao processada com sucesso.']);
    }

    public function getConversationMessages($conversationId)
    {
        $response = Http::withHeaders([
            'api_access_token' => $this->apiToken,
        ])
            ->timeout(5)
            ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}/messages");

        if ($response->failed()) {
            return response()->json(['error' => 'Nao foi possivel carregar as mensagens'], 500);
        }

        return response()->json($response->json());
    }

    public function sendMessage(Request $request, $conversationId)
    {
        $data = $request->all();

        $payload = [
            'content' => $data['content'] ?? '',
            'message_type' => 'outgoing',
        ];

        $isTemplateMessage = ($data['content_type'] ?? null) === 'template';

        if ($isTemplateMessage) {
            $payload['content_type'] = 'template';
            $payload['content_attributes'] = $data['content_attributes'] ?? [];
        }

        $response = Http::withHeaders([
            'api_access_token' => $this->apiToken,
        ])->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}/messages", $payload);

        $inboxId = isset($data['inbox_id']) ? (int) $data['inbox_id'] : null;

        if ($response->successful() || !$isTemplateMessage || !$this->hasMetaMessagingConfig($inboxId)) {
            return response()->json($response->json(), $response->status());
        }

        $phoneNumber = $data['to_phone_number'] ?? null;
        $contentAttributes = $data['content_attributes'] ?? [];

        if (!$phoneNumber) {
            return response()->json([
                'message' => 'O Chatwoot rejeitou o template e o fallback da Meta nao recebeu um numero de destino.',
                'chatwoot_error' => $response->json(),
                'hint' => 'Envie to_phone_number no payload do template para usar o fallback direto da Meta.',
            ], $response->status());
        }

        $metaResponse = $this->sendTemplateViaMeta($phoneNumber, $contentAttributes, $inboxId);

        if ($metaResponse['ok']) {
            return response()->json([
                'id' => $metaResponse['message_id'] ?? ('meta-template-' . time()),
                'content' => '[Template Meta enviado] ' . ($contentAttributes['template_name'] ?? 'template'),
                'message_type' => 'outgoing',
                'status' => 'sent',
                'created_at' => time(),
                'content_type' => 'template',
                'content_attributes' => $contentAttributes,
                'meta_fallback' => true,
            ], 200);
        }

        return response()->json([
            'message' => 'Falha ao enviar o template pelo Chatwoot e tambem pelo fallback direto da Meta.',
            'chatwoot_error' => $response->json(),
            'meta_error' => $metaResponse['error'] ?? null,
        ], $metaResponse['status'] ?? $response->status());
    }

    public function getConversationByCase(LegalCase $legal_case)
    {
        $conversation = Conversation::where('legal_case_id', $legal_case->id)->first();

        if (!$conversation) {
            return response()->json(['messages' => []]);
        }

        $messages = $conversation->chatMessages()->orderBy('created_at', 'asc')->get();

        return response()->json([
            'conversation' => $conversation,
            'messages' => $messages,
        ]);
    }

    public function getTemplates(Request $request)
    {
        $validated = $request->validate([
            'inbox_id' => 'required|integer',
        ]);

        $inboxId = (int) $validated['inbox_id'];
        $url = "{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/inboxes/{$inboxId}/whatsapp_templates";

        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->apiToken,
            ])->get($url);

            if ($response->successful()) {
                return response()->json([
                    'payload' => $this->normalizeTemplates($response->json('payload', [])),
                    'source' => 'chatwoot',
                ]);
            }

            $inbox = $this->findInboxById($inboxId);

            if ($this->hasMetaTemplateConfig($inboxId)) {
                $metaResponse = $this->fetchMetaTemplates($inboxId);

                if ($metaResponse['ok']) {
                    return response()->json([
                        'payload' => $this->normalizeTemplates($metaResponse['data']),
                        'source' => 'meta',
                        'fallback' => true,
                    ]);
                }

                return response()->json([
                    'message' => 'Nem o Chatwoot nem a Meta retornaram os templates.',
                    'inbox' => $inbox,
                    'chatwoot_error' => $response->json() ?? ['body' => $response->body()],
                    'meta_error' => $metaResponse['error'] ?? null,
                    'hint' => 'Confira as credenciais META_WHATSAPP_ACCESS_TOKEN e o mapeamento do inbox_id no Coolify.',
                ], $metaResponse['status'] ?? 502);
            }

            return response()->json([
                'message' => 'Nao foi possivel carregar os templates do WhatsApp no Chatwoot.',
                'inbox' => $inbox,
                'details' => $response->json() ?? ['body' => $response->body()],
                'hint' => $this->buildTemplateFailureHint($response->status(), $inbox, $inboxId),
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao consultar templates do WhatsApp.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function normalizeTemplates(array $rawTemplates): array
    {
        return collect($rawTemplates)
            ->map(function ($template) {
                $components = collect($template['components'] ?? [])
                    ->filter(fn ($component) => is_array($component))
                    ->values()
                    ->all();

                $bodyComponent = collect($components)
                    ->first(fn ($component) => Str::upper($component['type'] ?? '') === 'BODY');

                return [
                    'id' => $template['id'] ?? $template['name'] ?? null,
                    'name' => $template['name'] ?? null,
                    'category' => $template['category'] ?? null,
                    'status' => $template['status'] ?? null,
                    'language' => $template['language'] ?? $template['language_code'] ?? data_get($template, 'language.locale'),
                    'body_text' => $bodyComponent['text'] ?? null,
                    'components' => $components,
                    'raw' => $template,
                ];
            })
            ->filter(fn ($template) => filled($template['name']))
            ->values()
            ->all();
    }

    private function fetchMetaTemplates(?int $inboxId): array
    {
        $businessAccountId = $this->resolveMetaBusinessAccountId($inboxId);

        try {
            $response = Http::withToken($this->metaAccessToken)
                ->acceptJson()
                ->get($this->metaGraphUrl("{$businessAccountId}/message_templates"), [
                    'limit' => 100,
                    'fields' => 'name,status,category,language,components',
                ]);

            if ($response->failed()) {
                return [
                    'ok' => false,
                    'status' => $response->status(),
                    'error' => $response->json() ?? ['body' => $response->body()],
                ];
            }

            return [
                'ok' => true,
                'data' => $response->json('data', []),
            ];
        } catch (\Exception $e) {
            return [
                'ok' => false,
                'status' => 500,
                'error' => ['message' => $e->getMessage()],
            ];
        }
    }

    private function sendTemplateViaMeta(string $phoneNumber, array $contentAttributes, ?int $inboxId): array
    {
        $phoneNumberId = $this->resolveMetaPhoneNumberId($inboxId);

        try {
            $normalizedPhone = preg_replace('/\D+/', '', $phoneNumber);
            $languageCode = $contentAttributes['language_code'] ?? 'pt_BR';
            $templateName = $contentAttributes['template_name'] ?? null;

            if (!$normalizedPhone || !$templateName || !$phoneNumberId) {
                return [
                    'ok' => false,
                    'status' => 422,
                    'error' => ['message' => 'Numero de destino, nome do template ou phone_number_id ausente para o envio via Meta.'],
                ];
            }

            $response = Http::withToken($this->metaAccessToken)
                ->acceptJson()
                ->post($this->metaGraphUrl("{$phoneNumberId}/messages"), [
                    'messaging_product' => 'whatsapp',
                    'to' => $normalizedPhone,
                    'type' => 'template',
                    'template' => [
                        'name' => $templateName,
                        'language' => [
                            'code' => $languageCode,
                        ],
                    ],
                ]);

            if ($response->failed()) {
                return [
                    'ok' => false,
                    'status' => $response->status(),
                    'error' => $response->json() ?? ['body' => $response->body()],
                ];
            }

            return [
                'ok' => true,
                'message_id' => data_get($response->json(), 'messages.0.id'),
            ];
        } catch (\Exception $e) {
            return [
                'ok' => false,
                'status' => 500,
                'error' => ['message' => $e->getMessage()],
            ];
        }
    }

    private function findInboxById(int $inboxId): ?array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->apiToken,
            ])->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/inboxes");

            $inboxes = $response->json('payload', []);

            if (!is_array($inboxes)) {
                return null;
            }

            foreach ($inboxes as $inbox) {
                if ((int) ($inbox['id'] ?? 0) === $inboxId) {
                    return $inbox;
                }
            }
        } catch (\Exception $e) {
            return null;
        }

        return null;
    }

    private function hasMetaTemplateConfig(?int $inboxId): bool
    {
        return filled($this->metaAccessToken) && filled($this->resolveMetaBusinessAccountId($inboxId));
    }

    private function hasMetaMessagingConfig(?int $inboxId): bool
    {
        return $this->hasMetaTemplateConfig($inboxId) && filled($this->resolveMetaPhoneNumberId($inboxId));
    }

    private function resolveMetaBusinessAccountId(?int $inboxId): ?string
    {
        if ($inboxId !== null && isset($this->metaBusinessAccountIdMap[(string) $inboxId])) {
            return (string) $this->metaBusinessAccountIdMap[(string) $inboxId];
        }

        return filled($this->metaBusinessAccountId) ? (string) $this->metaBusinessAccountId : null;
    }

    private function resolveMetaPhoneNumberId(?int $inboxId): ?string
    {
        if ($inboxId !== null && isset($this->metaPhoneNumberIdMap[(string) $inboxId])) {
            return (string) $this->metaPhoneNumberIdMap[(string) $inboxId];
        }

        return filled($this->metaPhoneNumberId) ? (string) $this->metaPhoneNumberId : null;
    }

    private function parseEnvMap($rawValue): array
    {
        if (!is_string($rawValue) || trim($rawValue) === '') {
            return [];
        }

        $decoded = json_decode($rawValue, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function metaGraphUrl(string $path): string
    {
        return "https://graph.facebook.com/{$this->metaApiVersion}/{$path}";
    }

    private function buildTemplateFailureHint(int $status, ?array $inbox, ?int $inboxId): string
    {
        $channelType = Str::lower((string) ($inbox['channel_type'] ?? ''));
        $provider = Str::lower((string) ($inbox['provider'] ?? ''));

        if ($status === 404) {
            if ($channelType !== '' && !Str::contains($channelType, 'whatsapp')) {
                return 'A inbox selecionada nao e um canal do WhatsApp. Templates da Meta so aparecem em inboxes de WhatsApp.';
            }

            if ($provider !== '' && !Str::contains($provider, 'cloud')) {
                return 'A inbox parece nao ser WhatsApp Cloud. O endpoint de templates da Meta no Chatwoot pode nao existir para esse provider.';
            }

            if (!$this->hasMetaTemplateConfig($inboxId)) {
                return 'O Chatwoot respondeu 404 para whatsapp_templates e o fallback direto da Meta ainda nao foi configurado para esta inbox. Adicione META_WHATSAPP_ACCESS_TOKEN e o mapa META_WHATSAPP_BUSINESS_ACCOUNT_ID_MAP no Coolify.';
            }

            return 'O Chatwoot respondeu 404 para whatsapp_templates. O NIC pode usar os templates direto da Meta se as credenciais e o mapeamento desta inbox estiverem configurados no Coolify.';
        }

        return 'Confirme se a inbox e do WhatsApp e se os modelos foram sincronizados no painel administrativo do Chatwoot.';
    }
}
