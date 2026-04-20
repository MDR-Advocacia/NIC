<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\LegalCase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
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

        if ($response->successful()) {
            return response()->json($response->json());
        }

        return response()->json([
            'message' => 'Nao foi possivel criar o contato.',
            'details' => $response->json() ?? ['body' => $response->body()],
            'conflict_candidates' => $this->findPotentialExistingContacts($validated),
        ], $response->status());
    }

    public function updateContact(Request $request, $contactId)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string',
            'email' => 'nullable|email',
            'phone_number' => 'nullable|string',
            'blocked' => 'sometimes|boolean',
        ]);

        $payload = [];

        foreach (['name', 'email', 'phone_number', 'blocked'] as $field) {
            if ($request->exists($field)) {
                $payload[$field] = $validated[$field] ?? null;
            }
        }

        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->put("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts/{$contactId}", $payload);

        return response()->json($response->json() ?: ['success' => $response->successful()], $response->status());
    }

    public function destroyContact($contactId)
    {
        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->delete("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts/{$contactId}");

        return response()->json($response->json() ?: ['success' => $response->successful()], $response->status());
    }

    public function createConversationForContact(Request $request, $contactId)
    {
        $validated = $request->validate([
            'inbox_id' => 'required|integer',
        ]);

        $inboxId = (int) $validated['inbox_id'];

        $contactResponse = $this->fetchChatwootContact($contactId);

        if (($contactResponse['response'] ?? null)?->failed()) {
            return response()->json([
                'message' => 'Nao foi possivel carregar o contato para iniciar a conversa.',
                'details' => $contactResponse['details'] ?? null,
            ], $contactResponse['status'] ?? 500);
        }

        $contact = $contactResponse['contact'] ?? [];
        $sourceId = $this->resolveContactInboxSourceId($contact, $inboxId);
        $contactableInboxes = [];

        if (blank($sourceId)) {
            $contactableInboxes = $this->fetchContactableInboxes($contactId);
            $sourceId = $this->resolveContactableInboxSourceId($contactableInboxes, $inboxId);
        }

        if (blank($sourceId)) {
            return response()->json([
                'message' => 'O contato foi criado, mas nao foi possivel localizar o source_id da inbox para abrir a conversa.',
                'contact' => $contact,
                'contactable_inboxes' => $contactableInboxes,
            ], 422);
        }

        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations", [
                'source_id' => (string) $sourceId,
                'inbox_id' => $inboxId,
                'contact_id' => (int) $contactId,
                'status' => 'open',
            ]);

        return response()->json($response->json() ?: ['success' => $response->successful()], $response->status());
    }

    public function getInboxAgents($inboxId)
    {
        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/inbox_members/{$inboxId}");

        $data = $response->json();

        return response()->json($data['payload'] ?? $data, $response->status());
    }

    public function getAccountAgents()
    {
        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/agents");

        $data = $response->json();

        return response()->json($data['payload'] ?? $data, $response->status());
    }

    public function addAgentToInbox(Request $request, $inboxId)
    {
        $validated = $request->validate([
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'integer',
        ]);

        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/inbox_members", [
                'inbox_id' => (int) $inboxId,
                'user_ids' => array_values($validated['user_ids']),
            ]);

        return response()->json($response->json() ?: ['success' => $response->successful()], $response->status());
    }

    public function assignConversation(Request $request, $conversationId)
    {
        $validated = $request->validate([
            'assignee_id' => 'nullable|integer',
        ]);

        $response = Http::withHeaders([
            'api_access_token' => $this->apiToken,
        ])->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}/assignments", [
            'assignee_id' => $validated['assignee_id'] ?? null,
        ]);

        return response()->json($response->json() ?: ['success' => $response->successful()], $response->status());
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
            'contact_name' => 'nullable|string|max:255',
            'contact_phone' => 'nullable|string|max:255',
        ]);

        $legalCase = LegalCase::findOrFail($validated['legal_case_id']);
        $conversation = $this->resolveConversationRecord($conversationId);
        $previousCaseId = $conversation?->legal_case_id ? (int) $conversation->legal_case_id : null;

        if (! $conversation) {
            $conversation = new Conversation();

            if ($this->conversationHasChatwootIdColumn()) {
                $conversation->chatwoot_id = (string) $conversationId;
            } else {
                $conversation->id = (int) $conversationId;
            }
        }

        if (blank($conversation->contact_name) && filled($validated['contact_name'] ?? null)) {
            $conversation->contact_name = $validated['contact_name'];
        }

        if (blank($conversation->contact_phone) && filled($validated['contact_phone'] ?? null)) {
            $conversation->contact_phone = $validated['contact_phone'];
        }

        if ($previousCaseId === (int) $legalCase->id) {
            return response()->json([
                'message' => 'Esta conversa ja estava vinculada a este processo.',
                'legal_case' => [
                    'id' => $legalCase->id,
                    'case_number' => $legalCase->case_number,
                ],
            ]);
        }

        $conversation->legal_case_id = $legalCase->id;
        $conversation->save();

        $this->registrarHistoricoDeVinculo($request, $legalCase, $conversation, $conversationId, $previousCaseId);

        return response()->json([
            'message' => 'Conversa vinculada ao processo com sucesso.',
            'legal_case' => [
                'id' => $legalCase->id,
                'case_number' => $legalCase->case_number,
            ],
        ]);
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
        $attachments = $request->file('attachments', []);

        if (!is_array($attachments)) {
            $attachments = $attachments ? [$attachments] : [];
        }

        if (count(array_filter($attachments)) > 0) {
            return $this->sendAttachmentMessage($conversationId, $data, $attachments);
        }

        $templateParams = is_array($data['template_params'] ?? null) ? $data['template_params'] : null;
        $contentAttributes = is_array($data['content_attributes'] ?? null) ? $data['content_attributes'] : [];

        $payload = [
            'content' => $data['content'] ?? '',
            'message_type' => 'outgoing',
        ];

        $isTemplateMessage = ($data['content_type'] ?? null) === 'template' || filled($templateParams);

        if ($isTemplateMessage) {
            $payload['content_type'] = 'template';
            $payload['content_attributes'] = $this->buildTemplateContentAttributes($contentAttributes, $templateParams);

            if ($templateParams) {
                $payload['template_params'] = $templateParams;
            }
        }

        $response = Http::withHeaders([
            'api_access_token' => $this->apiToken,
        ])->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}/messages", $payload);

        $inboxId = isset($data['inbox_id']) ? (int) $data['inbox_id'] : null;

        if ($response->successful() || !$isTemplateMessage || !$this->hasMetaMessagingConfig($inboxId)) {
            return response()->json($response->json(), $response->status());
        }

        $phoneNumber = $data['to_phone_number'] ?? null;

        if (!$phoneNumber) {
            return response()->json([
                'message' => 'O Chatwoot rejeitou o template e o fallback da Meta nao recebeu um numero de destino.',
                'chatwoot_error' => $response->json(),
                'hint' => 'Envie to_phone_number no payload do template para usar o fallback direto da Meta.',
            ], $response->status());
        }

        $metaResponse = $this->sendTemplateViaMeta($phoneNumber, $payload['content_attributes'], $templateParams, $inboxId);

        if ($metaResponse['ok']) {
            $fallbackMessage = [
                'id' => $metaResponse['message_id'] ?? ('meta-template-' . time()),
                'content' => $data['content'] ?? ('[Template Meta enviado] ' . ($payload['content_attributes']['template_name'] ?? 'template')),
                'message_type' => 'outgoing',
                'status' => 'sent',
                'created_at' => time(),
                'content_type' => 'template',
                'content_attributes' => $payload['content_attributes'],
                'template_params' => $templateParams,
                'meta_fallback' => true,
            ];

            return response()->json($fallbackMessage, 200);
        }

        return response()->json([
            'message' => 'Falha ao enviar o template pelo Chatwoot e tambem pelo fallback direto da Meta.',
            'chatwoot_error' => $response->json(),
            'meta_error' => $metaResponse['error'] ?? null,
        ], $metaResponse['status'] ?? $response->status());
    }

    private function sendAttachmentMessage($conversationId, array $data, array $attachments)
    {
        $requestBuilder = Http::withHeaders([
            'api_access_token' => $this->apiToken,
        ])->acceptJson();

        foreach ($attachments as $attachment) {
            if (!$attachment || !$attachment->isValid()) {
                continue;
            }

            $requestBuilder = $requestBuilder->attach(
                'attachments[]',
                file_get_contents($attachment->getRealPath()),
                $attachment->getClientOriginalName()
            );
        }

        $payload = [
            'content' => $data['content'] ?? '',
            'message_type' => 'outgoing',
        ];

        if (filled($data['file_type'] ?? null)) {
            $payload['file_type'] = $data['file_type'];
        }

        $response = $requestBuilder->post(
            "{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}/messages",
            $payload
        );

        return response()->json($response->json(), $response->status());
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

    private function resolveConversationRecord($conversationId): ?Conversation
    {
        if ($this->conversationHasChatwootIdColumn()) {
            $conversation = Conversation::where('chatwoot_id', (string) $conversationId)->first();

            if ($conversation) {
                return $conversation;
            }
        }

        return Conversation::find($conversationId);
    }

    private function conversationHasChatwootIdColumn(): bool
    {
        static $hasChatwootIdColumn = null;

        if ($hasChatwootIdColumn === null) {
            $hasChatwootIdColumn = Schema::hasColumn('conversations', 'chatwoot_id');
        }

        return $hasChatwootIdColumn;
    }

    private function registrarHistoricoDeVinculo(
        Request $request,
        LegalCase $legalCase,
        Conversation $conversation,
        $conversationId,
        ?int $previousCaseId
    ): void {
        $descricaoContato = $conversation->contact_name
            ? " do atendimento com {$conversation->contact_name}"
            : '';

        $legalCase->histories()->create([
            'user_id' => $request->user()?->id,
            'event_type' => 'conversation_linked',
            'description' => "Conversa{$descricaoContato} (Chatwoot #{$conversationId}) vinculada a este processo.",
            'old_values' => $previousCaseId ? ['legal_case_id' => $previousCaseId] : null,
            'new_values' => [
                'legal_case_id' => $legalCase->id,
                'case_number' => $legalCase->case_number,
                'chatwoot_conversation_id' => (string) $conversationId,
                'contact_name' => $conversation->contact_name,
                'contact_phone' => $conversation->contact_phone,
            ],
        ]);

        if ($previousCaseId && $previousCaseId !== (int) $legalCase->id) {
            $oldCase = LegalCase::find($previousCaseId);

            if ($oldCase) {
                $oldCase->histories()->create([
                    'user_id' => $request->user()?->id,
                    'event_type' => 'conversation_unlinked',
                    'description' => "Conversa{$descricaoContato} (Chatwoot #{$conversationId}) desvinculada deste processo e movida para o processo {$legalCase->case_number}.",
                    'old_values' => [
                        'legal_case_id' => $oldCase->id,
                        'case_number' => $oldCase->case_number,
                    ],
                    'new_values' => [
                        'legal_case_id' => $legalCase->id,
                        'case_number' => $legalCase->case_number,
                    ],
                ]);
            }
        }
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

    private function extractChatwootContact(array $data): array
    {
        if (is_array($data['payload']['contact'] ?? null)) {
            return $data['payload']['contact'];
        }

        if (is_array($data['payload'] ?? null)) {
            return $data['payload'];
        }

        if (is_array($data['contact'] ?? null)) {
            return $data['contact'];
        }

        return $data;
    }

    private function extractChatwootContactsList(array $data): array
    {
        if (is_array($data['payload'] ?? null)) {
            return $data['payload'];
        }

        if (is_array($data['data']['payload'] ?? null)) {
            return $data['data']['payload'];
        }

        if (is_array($data['data'] ?? null)) {
            return $data['data'];
        }

        return is_array($data) ? $data : [];
    }

    private function resolveContactInboxSourceId(array $contact, int $inboxId): ?string
    {
        $contactInboxes = collect($contact['contact_inboxes'] ?? []);

        $match = $contactInboxes->first(function ($contactInbox) use ($inboxId) {
            $currentInboxId = data_get($contactInbox, 'inbox.id')
                ?? data_get($contactInbox, 'inbox_id')
                ?? data_get($contactInbox, 'source.inbox_id');

            return (int) $currentInboxId === (int) $inboxId;
        });

        $sourceId = data_get($match, 'source_id')
            ?? data_get($match, 'source.id')
            ?? data_get($match, 'identifier');

        return filled($sourceId) ? (string) $sourceId : null;
    }

    private function resolveContactableInboxSourceId(array $contactableInboxes, int $inboxId): ?string
    {
        $match = collect($contactableInboxes)->first(function ($contactInbox) use ($inboxId) {
            $currentInboxId = data_get($contactInbox, 'inbox.id')
                ?? data_get($contactInbox, 'inbox_id')
                ?? data_get($contactInbox, 'source.inbox_id');

            return (int) $currentInboxId === (int) $inboxId;
        });

        $sourceId = data_get($match, 'source_id')
            ?? data_get($match, 'source.id')
            ?? data_get($match, 'identifier');

        return filled($sourceId) ? (string) $sourceId : null;
    }

    private function fetchChatwootContact($contactId): array
    {
        $contactResponse = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts/{$contactId}");

        return [
            'response' => $contactResponse,
            'status' => $contactResponse->status(),
            'details' => $contactResponse->json() ?? ['body' => $contactResponse->body()],
            'contact' => $contactResponse->successful() ? $this->extractChatwootContact($contactResponse->json()) : [],
        ];
    }

    private function fetchContactableInboxes($contactId): array
    {
        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts/{$contactId}/contactable_inboxes");

        if ($response->failed()) {
            return [];
        }

        return $this->extractChatwootContactsList($response->json());
    }

    private function findPotentialExistingContacts(array $validated): array
    {
        $terms = collect([
            $validated['phone_number'] ?? null,
            preg_replace('/\D+/', '', (string) ($validated['phone_number'] ?? '')),
            $validated['email'] ?? null,
            $validated['name'] ?? null,
        ])
            ->filter(fn ($term) => filled($term))
            ->unique()
            ->values();

        if ($terms->isEmpty()) {
            return [];
        }

        $matches = collect();

        foreach ($terms as $term) {
            $response = Http::withHeaders(['api_access_token' => $this->apiToken])
                ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts", [
                    'search' => $term,
                ]);

            if ($response->failed()) {
                continue;
            }

            $matches = $matches->merge($this->extractChatwootContactsList($response->json()));
        }

        return $matches
            ->filter(fn ($contact) => $this->contactLooksEquivalent($contact, $validated))
            ->unique('id')
            ->values()
            ->all();
    }

    private function contactLooksEquivalent(array $contact, array $validated): bool
    {
        $requestedPhone = preg_replace('/\D+/', '', (string) ($validated['phone_number'] ?? ''));
        $contactPhone = preg_replace('/\D+/', '', (string) ($contact['phone_number'] ?? $contact['identifier'] ?? ''));

        $matchesPhone = $requestedPhone !== ''
            && $contactPhone !== ''
            && (Str::contains($contactPhone, $requestedPhone) || Str::contains($requestedPhone, $contactPhone));

        $requestedEmail = Str::lower(trim((string) ($validated['email'] ?? '')));
        $contactEmail = Str::lower(trim((string) ($contact['email'] ?? '')));
        $matchesEmail = $requestedEmail !== '' && $contactEmail !== '' && $requestedEmail === $contactEmail;

        $requestedName = Str::lower(trim((string) ($validated['name'] ?? '')));
        $contactName = Str::lower(trim((string) ($contact['name'] ?? '')));
        $matchesName = $requestedName !== '' && $contactName !== '' && $requestedName === $contactName;

        return $matchesPhone || $matchesEmail || $matchesName;
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

    private function sendTemplateViaMeta(string $phoneNumber, array $contentAttributes, ?array $templateParams, ?int $inboxId): array
    {
        $phoneNumberId = $this->resolveMetaPhoneNumberId($inboxId);

        try {
            $normalizedPhone = preg_replace('/\D+/', '', $phoneNumber);
            $languageCode = data_get($templateParams, 'language')
                ?? data_get($templateParams, 'language_code')
                ?? ($contentAttributes['language_code'] ?? 'pt_BR');
            $templateName = data_get($templateParams, 'name') ?? ($contentAttributes['template_name'] ?? null);
            $bodyParameters = $this->normalizeTemplateBodyParameters(data_get($templateParams, 'processed_params.body', []));

            if (!$normalizedPhone || !$templateName || !$phoneNumberId) {
                return [
                    'ok' => false,
                    'status' => 422,
                    'error' => ['message' => 'Numero de destino, nome do template ou phone_number_id ausente para o envio via Meta.'],
                ];
            }

            $templatePayload = [
                'name' => $templateName,
                'language' => [
                    'code' => $languageCode,
                ],
            ];

            if (!empty($bodyParameters)) {
                $templatePayload['components'] = [[
                    'type' => 'body',
                    'parameters' => collect($bodyParameters)
                        ->map(fn ($value) => [
                            'type' => 'text',
                            'text' => (string) $value,
                        ])
                        ->values()
                        ->all(),
                ]];
            }

            $response = Http::withToken($this->metaAccessToken)
                ->acceptJson()
                ->post($this->metaGraphUrl("{$phoneNumberId}/messages"), [
                    'messaging_product' => 'whatsapp',
                    'to' => $normalizedPhone,
                    'type' => 'template',
                    'template' => $templatePayload,
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

    private function buildTemplateContentAttributes(array $contentAttributes, ?array $templateParams): array
    {
        if (!$templateParams) {
            return $contentAttributes;
        }

        return array_filter([
            'template_name' => data_get($templateParams, 'name') ?? ($contentAttributes['template_name'] ?? null),
            'language_code' => data_get($templateParams, 'language')
                ?? data_get($templateParams, 'language_code')
                ?? ($contentAttributes['language_code'] ?? null),
        ], fn ($value) => filled($value));
    }

    private function normalizeTemplateBodyParameters($bodyParameters): array
    {
        if (!is_array($bodyParameters) || empty($bodyParameters)) {
            return [];
        }

        if (array_is_list($bodyParameters)) {
            return array_values(array_map(fn ($value) => (string) $value, $bodyParameters));
        }

        uksort($bodyParameters, function ($left, $right) {
            return (int) $left <=> (int) $right;
        });

        return collect($bodyParameters)
            ->map(fn ($value) => is_scalar($value) ? (string) $value : '')
            ->filter(fn ($value) => $value !== '')
            ->values()
            ->all();
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
