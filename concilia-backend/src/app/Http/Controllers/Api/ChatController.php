<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\LegalCase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
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
        $this->chatwootUrl = rtrim((string) config('app.chatwoot_url'), '/');
        $this->apiToken = config('app.chatwoot_api_token');
        $this->accountId = config('app.chatwoot_account_id');
        $this->metaAccessToken = config('services.meta_whatsapp.access_token');
        $this->metaBusinessAccountId = config('services.meta_whatsapp.business_account_id');
        $this->metaPhoneNumberId = config('services.meta_whatsapp.phone_number_id');
        $this->metaBusinessAccountIdMap = $this->parseEnvMap(config('services.meta_whatsapp.business_account_id_map'));
        $this->metaPhoneNumberIdMap = $this->parseEnvMap(config('services.meta_whatsapp.phone_number_id_map'));
        $this->metaApiVersion = config('services.meta_whatsapp.api_version', 'v22.0');
    }

    private function chatwootConfigurationErrorResponse()
    {
        $missing = [];

        if (blank($this->chatwootUrl)) {
            $missing[] = 'CHATWOOT_URL';
        }

        if (blank($this->apiToken)) {
            $missing[] = 'CHATWOOT_API_TOKEN';
        }

        if (blank($this->accountId)) {
            $missing[] = 'CHATWOOT_ACCOUNT_ID';
        }

        if (empty($missing)) {
            return null;
        }

        return response()->json([
            'message' => 'Integracao com Chatwoot nao configurada no backend.',
            'missing' => $missing,
            'hint' => 'Defina as variaveis CHATWOOT_URL, CHATWOOT_API_TOKEN e CHATWOOT_ACCOUNT_ID no ambiente do backend e refaca o deploy.',
        ], 503);
    }

    public function getContacts(Request $request)
    {
        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

        $search = $request->query('search');

        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts", [
                'search' => $search,
            ]);

        return response()->json($response->json());
    }

    public function resolveConversation($conversationId)
    {
        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

        $response = Http::withHeaders([
            'api_access_token' => $this->apiToken,
        ])->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}/toggle_status", [
            'status' => 'resolved',
        ]);

        return response()->json($response->json());
    }

    public function createContact(Request $request)
    {
        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

        $validated = Validator::make($this->buildContactPayload($request), [
            'name' => 'required|string',
            'email' => 'nullable|email',
            'phone_number' => 'nullable|string',
            'inbox_id' => 'required|integer',
        ])->validate();

        $payload = $this->buildChatwootContactCreatePayload($validated);
        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts", $payload);

        if ($response->successful()) {
            return response()->json($this->normalizeContactCreateResponse($response->json()));
        }

        $details = $response->json() ?? ['body' => $response->body()];
        $conflictCandidates = $this->findPotentialExistingContacts($validated);

        if (!empty($conflictCandidates) && in_array($response->status(), [400, 409, 422], true)) {
            return response()->json([
                'message' => 'Contato ja existia no Chatwoot e foi reaproveitado.',
                'payload' => [
                    'contact' => $conflictCandidates[0],
                ],
                'contact' => $conflictCandidates[0],
                'reused_existing' => true,
                'chatwoot_status' => $response->status(),
                'details' => $details,
                'conflict_candidates' => $conflictCandidates,
            ]);
        }

        Log::warning('Chatwoot rejeitou a criacao de contato', [
            'status' => $response->status(),
            'payload' => array_merge($payload, [
                'phone_number' => $payload['phone_number'] ?? null,
                'email' => filled($payload['email'] ?? null) ? '[email informado]' : null,
            ]),
            'details' => $details,
        ]);

        $chatwootMessage = $this->extractErrorText($details);

        return response()->json([
            'message' => $chatwootMessage
                ? "Nao foi possivel criar o contato: {$chatwootMessage}"
                : 'Nao foi possivel criar o contato.',
            'details' => $details,
            'conflict_candidates' => $conflictCandidates,
        ], $response->status());
    }

    public function updateContact(Request $request, $contactId)
    {
        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

        $validated = Validator::make($this->buildContactPayload($request, false), [
            'name' => 'sometimes|required|string',
            'email' => 'nullable|email',
            'phone_number' => 'nullable|string',
            'blocked' => 'sometimes|boolean',
        ])->validate();

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
        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->delete("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts/{$contactId}");

        return response()->json($response->json() ?: ['success' => $response->successful()], $response->status());
    }

    public function createConversationForContact(Request $request, $contactId)
    {
        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

        $validated = $request->validate([
            'inbox_id' => 'required|integer',
            'assignee_id' => 'nullable|integer',
            'assign_to_current_user' => 'sometimes|boolean',
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
        $sourceResolution = $this->resolveConversationSourceForContact($contactId, $contact, $inboxId);
        $sourceId = $sourceResolution['source_id'] ?? null;

        if (blank($sourceId)) {
            return response()->json([
                'message' => 'Nao foi possivel abrir a conversa: o Chatwoot nao retornou o source_id do contato neste canal.',
                'hint' => 'Confira se o contato tem telefone em formato internacional (+55...) e se esta associado a inbox selecionada.',
                'contact' => $contact,
                'contactable_inboxes' => $sourceResolution['contactable_inboxes'] ?? [],
                'created_contact_inbox' => $sourceResolution['created_contact_inbox'] ?? null,
            ], 422);
        }

        $assigneeId = $validated['assignee_id'] ?? null;

        if (!$assigneeId && ($validated['assign_to_current_user'] ?? false)) {
            $assigneeId = $this->resolveChatwootAssigneeIdForRequest($request);
        }

        $existingConversation = $this->findExistingOpenConversationForContact($contactId, $inboxId, $sourceId);

        if ($existingConversation) {
            $existingConversation = $this->assignConversationIfNeeded($existingConversation, $assigneeId);

            return response()->json([
                'payload' => $existingConversation,
                'reused_existing' => true,
            ]);
        }

        $payload = [
            'inbox_id' => $inboxId,
            'contact_id' => (int) $contactId,
            'status' => 'open',
            'source_id' => (string) $sourceId,
        ];

        if ($assigneeId) {
            $payload['assignee_id'] = (int) $assigneeId;
        }

        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations", $payload);

        if ($response->failed()) {
            $existingConversation = $this->findExistingOpenConversationForContact($contactId, $inboxId, $sourceId);

            if ($existingConversation) {
                $existingConversation = $this->assignConversationIfNeeded($existingConversation, $assigneeId);

                return response()->json([
                    'payload' => $existingConversation,
                    'reused_existing' => true,
                    'chatwoot_status' => $response->status(),
                    'details' => $response->json() ?? ['body' => $response->body()],
                ]);
            }
        }

        return response()->json($response->json() ?: ['success' => $response->successful()], $response->status());
    }

    public function getInboxAgents($inboxId)
    {
        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/inbox_members/{$inboxId}");

        $data = $response->json();

        return response()->json($data['payload'] ?? $data, $response->status());
    }

    public function getAccountAgents()
    {
        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/agents");

        $data = $response->json();

        return response()->json($data['payload'] ?? $data, $response->status());
    }

    public function addAgentToInbox(Request $request, $inboxId)
    {
        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

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
        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

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
        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

        $status = $request->query('status', 'open');
        $assigneeType = $request->query('assignee_type', 'all');
        $currentUserAssigneeId = null;

        if ($assigneeType === 'mine') {
            $assigneeType = 'me';
        }

        if ($assigneeType === 'me') {
            $currentUserAssigneeId = $this->resolveChatwootAssigneeIdForRequest($request);

            if ($currentUserAssigneeId) {
                $assigneeType = 'all';
            }
        }

        $queryParams = ['status' => $status];
        $inboxId = $request->query('inbox_id');

        if ($assigneeType !== 'all') {
            $queryParams['assignee_type'] = $assigneeType;
        }

        if (filled($inboxId)) {
            $queryParams['inbox_id'] = (int) $inboxId;
        }

        try {
            $response = Http::withHeaders(['api_access_token' => $this->apiToken])
                ->timeout(10)
                ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations", $queryParams);

            if ($response->failed()) {
                return response()->json(['error' => 'Erro na API'], 502);
            }

            $data = $response->json();
            $payload = $data['payload'] ?? data_get($data, 'data.payload') ?? $data;

            if ($currentUserAssigneeId && is_array($payload)) {
                $payload = $this->filterConversationsByAssignee($payload, $currentUserAssigneeId, $request->user()?->email);
            }

            return response()->json(is_array($payload) ? $this->attachLinkedCasesToConversations($payload) : $payload);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Timeout'], 504);
        }
    }

    public function getInboxes()
    {
        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/inboxes");

        $data = $response->json();

        return response()->json($data['payload'] ?? $data);
    }

    public function getMyInboxes(Request $request)
    {
        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

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
                'legal_case' => $this->serializeLinkedCase($legalCase),
            ]);
        }

        $conversation->legal_case_id = $legalCase->id;
        $conversation->save();

        $this->registrarHistoricoDeVinculo($request, $legalCase, $conversation, $conversationId, $previousCaseId);

        return response()->json([
            'message' => 'Conversa vinculada ao processo com sucesso.',
            'legal_case' => $this->serializeLinkedCase($legalCase),
        ]);
    }

    public function getConversationMessages($conversationId)
    {
        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

        $response = Http::withHeaders([
            'api_access_token' => $this->apiToken,
        ])
            ->timeout(5)
            ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}/messages");

        if ($response->failed()) {
            return response()->json(['error' => 'Nao foi possivel carregar as mensagens'], 500);
        }

        $payload = $response->json();

        if (!is_array($payload)) {
            $payload = ['payload' => $payload];
        }

        $conversation = $this->resolveConversationRecord($conversationId);
        if ($conversation?->legal_case_id) {
            $conversation->loadMissing([
                'legalCase.client',
                'legalCase.lawyer',
                'legalCase.indicator',
            ]);
        }

        $payload['linked_case'] = $this->serializeLinkedCase($conversation?->legalCase);
        $payload['conversation_record'] = $conversation
            ? [
                'id' => $conversation->id,
                'chatwoot_id' => $conversation->chatwoot_id ?? null,
                'legal_case_id' => $conversation->legal_case_id,
            ]
            : null;

        return response()->json($payload);
    }

    public function sendMessage(Request $request, $conversationId)
    {
        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

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

        if ($response->successful() || !$isTemplateMessage) {
            return response()->json($response->json(), $response->status());
        }

        if (!$this->hasMetaMessagingConfig($inboxId)) {
            return response()->json([
                'message' => 'O Chatwoot rejeitou o template e o fallback direto da Meta nao esta configurado para esta inbox.',
                'chatwoot_error' => $response->json() ?? ['body' => $response->body()],
                'hint' => 'Confirme o business_account_id e o phone_number_id desta inbox no Chatwoot ou configure os mapas META_WHATSAPP_BUSINESS_ACCOUNT_ID_MAP e META_WHATSAPP_PHONE_NUMBER_ID_MAP para este inbox_id.',
            ], $response->status());
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

    private function filterConversationsByAssignee(array $conversations, int $assigneeId, ?string $assigneeEmail = null): array
    {
        $normalizedEmail = Str::lower(trim((string) $assigneeEmail));

        return collect($conversations)
            ->filter(function ($conversation) use ($assigneeId, $normalizedEmail) {
                if (!is_array($conversation)) {
                    return false;
                }

                $currentAssigneeId = data_get($conversation, 'meta.assignee.id')
                    ?? data_get($conversation, 'assignee.id')
                    ?? data_get($conversation, 'assignee_id');

                if ($currentAssigneeId && (int) $currentAssigneeId === (int) $assigneeId) {
                    return true;
                }

                if ($normalizedEmail === '') {
                    return false;
                }

                $currentAssigneeEmail = Str::lower(trim((string) (
                    data_get($conversation, 'meta.assignee.email')
                    ?? data_get($conversation, 'assignee.email')
                    ?? ''
                )));

                return $currentAssigneeEmail !== '' && $currentAssigneeEmail === $normalizedEmail;
            })
            ->values()
            ->all();
    }

    private function attachLinkedCasesToConversations(array $conversations): array
    {
        if (empty($conversations)) {
            return $conversations;
        }

        $conversationIds = collect($conversations)
            ->map(fn ($conversation) => isset($conversation['id']) ? (string) $conversation['id'] : null)
            ->filter()
            ->unique()
            ->values();

        if ($conversationIds->isEmpty()) {
            return $conversations;
        }

        $query = Conversation::query()->with([
            'legalCase.client',
            'legalCase.lawyer',
            'legalCase.indicator',
        ]);

        $records = $this->conversationHasChatwootIdColumn()
            ? $query->whereIn('chatwoot_id', $conversationIds->all())->get()->keyBy(fn ($record) => (string) $record->chatwoot_id)
            : $query->whereIn('id', $conversationIds->map(fn ($id) => (int) $id)->all())->get()->keyBy(fn ($record) => (string) $record->id);

        return array_map(function ($conversation) use ($records) {
            if (!is_array($conversation) || !isset($conversation['id'])) {
                return $conversation;
            }

            $record = $records->get((string) $conversation['id']);

            if (!$record) {
                return $conversation;
            }

            $conversation['linked_case'] = $this->serializeLinkedCase($record->legalCase);
            $conversation['conversation_record'] = [
                'id' => $record->id,
                'chatwoot_id' => $record->chatwoot_id ?? null,
                'legal_case_id' => $record->legal_case_id,
            ];

            return $conversation;
        }, $conversations);
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

    private function serializeLinkedCase(?LegalCase $legalCase): ?array
    {
        if (!$legalCase) {
            return null;
        }

        $legalCase->loadMissing([
            'client',
            'lawyer',
            'indicator',
        ]);

        return [
            'id' => $legalCase->id,
            'case_number' => $legalCase->case_number,
            'status' => $legalCase->status,
            'client' => $legalCase->client ? [
                'id' => $legalCase->client->id,
                'name' => $legalCase->client->name,
            ] : null,
            'lawyer' => $legalCase->lawyer ? [
                'id' => $legalCase->lawyer->id,
                'name' => $legalCase->lawyer->name,
            ] : null,
            'indicator' => $legalCase->indicator ? [
                'id' => $legalCase->indicator->id,
                'name' => $legalCase->indicator->name,
            ] : null,
            'has_alcada' => (bool) $legalCase->has_alcada,
            'original_value' => $legalCase->original_value,
            'cause_value' => $legalCase->cause_value,
            'agreement_value' => $legalCase->agreement_value,
            'agreement_probability' => $legalCase->agreement_probability,
            'pcond_probability' => $legalCase->pcond_probability,
            'updated_condemnation_value' => $legalCase->updated_condemnation_value,
            'agreement_closed_at' => $legalCase->agreement_closed_at?->toDateString(),
            'tags' => $legalCase->tags,
        ];
    }

    private function buildContactPayload(Request $request, bool $includeInbox = true): array
    {
        $payload = [];

        foreach (['name', 'email', 'phone_number', 'blocked'] as $field) {
            if ($request->exists($field)) {
                if ($field === 'phone_number') {
                    $payload[$field] = $this->normalizePhoneNumberForChatwoot($request->input($field));
                    continue;
                }

                $payload[$field] = in_array($field, ['name', 'email'], true)
                    ? $this->normalizeNullableText($request->input($field))
                    : $request->input($field);
            }
        }

        if ($includeInbox || $request->exists('inbox_id')) {
            $payload['inbox_id'] = $request->input('inbox_id');
        }

        return $payload;
    }

    private function buildChatwootContactCreatePayload(array $validated): array
    {
        $payload = [];

        foreach (['name', 'email', 'phone_number', 'inbox_id'] as $field) {
            if (!array_key_exists($field, $validated)) {
                continue;
            }

            $value = $validated[$field];

            if ($value === null || $value === '') {
                continue;
            }

            $payload[$field] = $value;
        }

        return $payload;
    }

    private function normalizeContactCreateResponse($data): array
    {
        $data = is_array($data) ? $data : [];
        $contact = $this->extractChatwootContact($data);

        if (empty($contact)) {
            return $data;
        }

        $rawPayload = $data['payload'] ?? null;
        $data['contact'] = $contact;

        if (!is_array($rawPayload) || array_is_list($rawPayload)) {
            $data['payload'] = ['contact' => $contact];

            if ($rawPayload !== null) {
                $data['raw_payload'] = $rawPayload;
            }

            return $data;
        }

        $data['payload']['contact'] = $data['payload']['contact'] ?? $contact;

        return $data;
    }

    private function normalizeNullableText($value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }

    private function extractErrorText($value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        if (is_string($value) || is_numeric($value) || is_bool($value)) {
            return trim((string) $value);
        }

        if (is_array($value)) {
            foreach (['message', 'error', 'error_message', 'errors', 'details', 'description', 'body'] as $key) {
                if (!array_key_exists($key, $value)) {
                    continue;
                }

                $text = $this->extractErrorText($value[$key]);

                if ($text !== '') {
                    return $text;
                }
            }

            foreach ($value as $item) {
                $text = $this->extractErrorText($item);

                if ($text !== '') {
                    return $text;
                }
            }
        }

        return '';
    }

    private function normalizePhoneNumberForChatwoot($value): ?string
    {
        $normalized = $this->normalizeNullableText($value);

        if ($normalized === null) {
            return null;
        }

        $hasPlus = Str::startsWith($normalized, '+');
        $digits = preg_replace('/\D+/', '', $normalized);

        if ($digits === '') {
            return null;
        }

        if (Str::startsWith($digits, '00')) {
            $digits = substr($digits, 2);
            return $digits !== '' ? "+{$digits}" : null;
        }

        if (!$hasPlus && Str::startsWith($digits, '0') && in_array(strlen($digits), [11, 12, 13], true)) {
            $digits = ltrim($digits, '0');
        }

        if ($hasPlus) {
            return "+{$digits}";
        }

        if (in_array(strlen($digits), [10, 11], true)) {
            return "+55{$digits}";
        }

        return "+{$digits}";
    }

    public function getTemplates(Request $request)
    {
        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

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
            if (array_is_list($data['payload'])) {
                return is_array($data['payload'][0] ?? null) ? $data['payload'][0] : [];
            }

            return $data['payload'];
        }

        if (is_array($data['data']['payload']['contact'] ?? null)) {
            return $data['data']['payload']['contact'];
        }

        if (is_array($data['data']['payload'] ?? null)) {
            if (array_is_list($data['data']['payload'])) {
                return is_array($data['data']['payload'][0] ?? null) ? $data['data']['payload'][0] : [];
            }

            return $data['data']['payload'];
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

    private function resolveConversationSourceForContact($contactId, array $contact, int $inboxId): array
    {
        $sourceId = $this->resolveContactInboxSourceId($contact, $inboxId);
        $contactableInboxes = [];
        $createdContactInbox = null;

        if (blank($sourceId)) {
            $contactableInboxes = $this->fetchContactableInboxes($contactId);
            $sourceId = $this->resolveContactableInboxSourceId($contactableInboxes, $inboxId);
        }

        if (blank($sourceId)) {
            $sourceCandidate = $this->deriveContactSourceId($contact);

            if (filled($sourceCandidate)) {
                $createdContactInbox = $this->createContactInbox($contactId, $inboxId, $sourceCandidate);
                $sourceId = $createdContactInbox['source_id'] ?? null;

                if (blank($sourceId)) {
                    $contactableInboxes = $this->fetchContactableInboxes($contactId);
                    $sourceId = $this->resolveContactableInboxSourceId($contactableInboxes, $inboxId);
                }
            }
        }

        return [
            'source_id' => filled($sourceId) ? (string) $sourceId : null,
            'contactable_inboxes' => $contactableInboxes,
            'created_contact_inbox' => $createdContactInbox,
        ];
    }

    private function createContactInbox($contactId, int $inboxId, string $sourceId): array
    {
        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts/{$contactId}/contact_inboxes", [
                'inbox_id' => $inboxId,
                'source_id' => $sourceId,
            ]);

        $data = $response->json() ?? [];

        if ($response->failed()) {
            return [
                'ok' => false,
                'status' => $response->status(),
                'source_id' => null,
                'details' => is_array($data) ? $data : ['body' => $response->body()],
            ];
        }

        $resolvedSourceId = data_get($data, 'source_id')
            ?? data_get($data, 'payload.source_id')
            ?? $this->resolveContactableInboxSourceId([is_array($data) ? $data : []], $inboxId);

        return [
            'ok' => true,
            'status' => $response->status(),
            'source_id' => filled($resolvedSourceId) ? (string) $resolvedSourceId : $sourceId,
            'details' => $data,
        ];
    }

    private function deriveContactSourceId(array $contact): ?string
    {
        $candidates = [
            $this->getContactPhoneCandidate($contact),
            $contact['identifier'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            $normalized = $this->normalizePhoneNumberForChatwoot($candidate);

            if (filled($normalized)) {
                return $normalized;
            }
        }

        return null;
    }

    private function getContactPhoneCandidate(array $contact): ?string
    {
        foreach ([
            $contact['phone_number'] ?? null,
            $contact['identifier'] ?? null,
            data_get($contact, 'additional_attributes.phone_number'),
            data_get($contact, 'additional_attributes.phone'),
            data_get($contact, 'additional_attributes.whatsapp'),
            data_get($contact, 'additional_attributes.whatsapp_number'),
            data_get($contact, 'custom_attributes.phone_number'),
            data_get($contact, 'custom_attributes.phone'),
            data_get($contact, 'custom_attributes.whatsapp'),
            data_get($contact, 'custom_attributes.whatsapp_number'),
            data_get($contact, 'contact_inboxes.0.source_id'),
        ] as $candidate) {
            if (filled($candidate)) {
                return (string) $candidate;
            }
        }

        return null;
    }

    private function findExistingOpenConversationForContact($contactId, int $inboxId, ?string $sourceId = null): ?array
    {
        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->timeout(10)
            ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations", [
                'status' => 'open',
                'assignee_type' => 'all',
                'inbox_id' => $inboxId,
            ]);

        if ($response->failed()) {
            return null;
        }

        $conversations = collect($this->extractChatwootContactsList($response->json()))
            ->filter(fn ($conversation) => is_array($conversation))
            ->filter(function ($conversation) use ($contactId, $inboxId, $sourceId) {
                $conversationInboxId = data_get($conversation, 'inbox_id')
                    ?? data_get($conversation, 'meta.inbox.id')
                    ?? data_get($conversation, 'inbox.id');

                if ((int) $conversationInboxId !== (int) $inboxId) {
                    return false;
                }

                $conversationContactId = data_get($conversation, 'meta.sender.id')
                    ?? data_get($conversation, 'contact.id')
                    ?? data_get($conversation, 'contact_inbox.contact_id');

                if ((string) $conversationContactId === (string) $contactId) {
                    return true;
                }

                if (blank($sourceId)) {
                    return false;
                }

                $conversationSourceId = data_get($conversation, 'contact_inbox.source_id')
                    ?? data_get($conversation, 'source_id')
                    ?? data_get($conversation, 'last_non_activity_message.source_id');

                return filled($conversationSourceId) && (string) $conversationSourceId === (string) $sourceId;
            })
            ->sortByDesc(fn ($conversation) => $this->getConversationActivityTimestamp($conversation))
            ->values();

        return $conversations->first();
    }

    private function getConversationActivityTimestamp(array $conversation): int
    {
        foreach ([
            data_get($conversation, 'last_activity_at'),
            data_get($conversation, 'last_non_activity_message.created_at'),
            data_get($conversation, 'updated_at'),
            data_get($conversation, 'timestamp'),
            data_get($conversation, 'created_at'),
        ] as $value) {
            if (is_numeric($value)) {
                return (int) $value;
            }

            if (is_string($value) && trim($value) !== '') {
                $parsed = strtotime($value);

                if ($parsed !== false) {
                    return $parsed;
                }
            }
        }

        return 0;
    }

    private function resolveChatwootAssigneeIdForRequest(Request $request): ?int
    {
        $email = Str::lower(trim((string) ($request->user()?->email ?? '')));

        if ($email === '') {
            return null;
        }

        return Cache::remember("chatwoot:agent_id_by_email:{$email}", now()->addMinutes(10), function () use ($email) {
            $response = Http::withHeaders(['api_access_token' => $this->apiToken])
                ->timeout(5)
                ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/agents");

            if ($response->failed()) {
                return null;
            }

            $agent = collect($this->extractChatwootContactsList($response->json()))
                ->filter(fn ($candidate) => is_array($candidate))
                ->first(fn ($candidate) => Str::lower(trim((string) ($candidate['email'] ?? ''))) === $email);

            return isset($agent['id']) ? (int) $agent['id'] : null;
        });
    }

    private function assignConversationIfNeeded(array $conversation, ?int $assigneeId): array
    {
        if (!$assigneeId || data_get($conversation, 'meta.assignee.id')) {
            return $conversation;
        }

        $conversationId = $conversation['id'] ?? null;

        if (!$conversationId) {
            return $conversation;
        }

        $response = Http::withHeaders(['api_access_token' => $this->apiToken])
            ->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}/assignments", [
                'assignee_id' => $assigneeId,
            ]);

        if ($response->successful()) {
            $conversation['meta']['assignee'] = $response->json();
        }

        return $conversation;
    }

    private function findPotentialExistingContacts(array $validated): array
    {
        $normalizedPhone = $this->normalizePhoneNumberForChatwoot($validated['phone_number'] ?? null);
        $phoneDigits = preg_replace('/\D+/', '', (string) $normalizedPhone);
        $nationalPhone = Str::startsWith($phoneDigits, '55') ? substr($phoneDigits, 2) : $phoneDigits;

        $terms = collect([
            $normalizedPhone,
            $phoneDigits,
            $nationalPhone,
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
            ->filter(fn ($contact) => is_array($contact) && $this->contactLooksEquivalent($contact, $validated))
            ->unique('id')
            ->values()
            ->all();
    }

    private function contactLooksEquivalent(array $contact, array $validated): bool
    {
        $requestedPhone = preg_replace('/\D+/', '', (string) $this->normalizePhoneNumberForChatwoot($validated['phone_number'] ?? ''));
        $contactPhone = preg_replace('/\D+/', '', (string) $this->normalizePhoneNumberForChatwoot($this->getContactPhoneCandidate($contact)));
        $requestedNationalPhone = Str::startsWith($requestedPhone, '55') ? substr($requestedPhone, 2) : $requestedPhone;
        $contactNationalPhone = Str::startsWith($contactPhone, '55') ? substr($contactPhone, 2) : $contactPhone;

        $matchesPhone = $requestedPhone !== ''
            && $contactPhone !== ''
            && (
                $requestedPhone === $contactPhone
                || $requestedNationalPhone === $contactNationalPhone
                || Str::contains($contactPhone, $requestedPhone)
                || Str::contains($requestedPhone, $contactPhone)
            );

        $requestedEmail = Str::lower(trim((string) ($validated['email'] ?? '')));
        $contactEmail = Str::lower(trim((string) ($contact['email'] ?? '')));
        $matchesEmail = $requestedEmail !== '' && $contactEmail !== '' && $requestedEmail === $contactEmail;

        $requestedName = Str::lower(trim((string) ($validated['name'] ?? '')));
        $contactName = Str::lower(trim((string) ($contact['name'] ?? '')));
        $matchesName = $requestedName !== '' && $contactName !== '' && $requestedName === $contactName;

        return $matchesPhone || $matchesEmail || ($requestedPhone === '' && $requestedEmail === '' && $matchesName);
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
        static $cache = [];

        if (array_key_exists($inboxId, $cache)) {
            return $cache[$inboxId];
        }

        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->apiToken,
            ])->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/inboxes");

            $inboxes = $response->json('payload', []);

            if (!is_array($inboxes)) {
                $cache[$inboxId] = null;
                return null;
            }

            foreach ($inboxes as $inbox) {
                if ((int) ($inbox['id'] ?? 0) === $inboxId) {
                    $cache[$inboxId] = $inbox;
                    return $inbox;
                }
            }
        } catch (\Exception $e) {
            $cache[$inboxId] = null;
            return null;
        }

        $cache[$inboxId] = null;
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

    private function shouldRequireInboxScopedMetaConfig(?int $inboxId): bool
    {
        return $inboxId !== null && (!empty($this->metaBusinessAccountIdMap) || !empty($this->metaPhoneNumberIdMap));
    }

    private function extractMetaInboxConfigValue(?array $inbox, array $paths): ?string
    {
        if (!$inbox) {
            return null;
        }

        foreach ($paths as $path) {
            $value = data_get($inbox, $path);

            if (filled($value)) {
                return (string) $value;
            }
        }

        return null;
    }

    private function resolveMetaBusinessAccountId(?int $inboxId): ?string
    {
        if ($inboxId !== null && isset($this->metaBusinessAccountIdMap[(string) $inboxId])) {
            return (string) $this->metaBusinessAccountIdMap[(string) $inboxId];
        }

        if ($inboxId !== null) {
            $inboxBusinessAccountId = $this->extractMetaInboxConfigValue($this->findInboxById($inboxId), [
                'channel.provider_config.business_account_id',
                'provider_config.business_account_id',
                'channel.business_account_id',
                'business_account_id',
            ]);

            if (filled($inboxBusinessAccountId)) {
                return $inboxBusinessAccountId;
            }

            if ($this->shouldRequireInboxScopedMetaConfig($inboxId)) {
                return null;
            }
        }

        return filled($this->metaBusinessAccountId) ? (string) $this->metaBusinessAccountId : null;
    }

    private function resolveMetaPhoneNumberId(?int $inboxId): ?string
    {
        if ($inboxId !== null && isset($this->metaPhoneNumberIdMap[(string) $inboxId])) {
            return (string) $this->metaPhoneNumberIdMap[(string) $inboxId];
        }

        if ($inboxId !== null) {
            $inboxPhoneNumberId = $this->extractMetaInboxConfigValue($this->findInboxById($inboxId), [
                'channel.provider_config.phone_number_id',
                'provider_config.phone_number_id',
                'channel.phone_number_id',
                'phone_number_id',
            ]);

            if (filled($inboxPhoneNumberId)) {
                return $inboxPhoneNumberId;
            }

            if ($this->shouldRequireInboxScopedMetaConfig($inboxId)) {
                return null;
            }
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
