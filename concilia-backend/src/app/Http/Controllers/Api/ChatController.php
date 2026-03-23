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

    public function __construct()
    {
        $this->chatwootUrl = env('CHATWOOT_URL');
        $this->apiToken = env('CHATWOOT_API_TOKEN');
        $this->accountId = env('CHATWOOT_ACCOUNT_ID');
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

        if (($data['content_type'] ?? null) === 'template') {
            $payload['content_type'] = 'template';
            $payload['content_attributes'] = $data['content_attributes'] ?? [];
        }

        $response = Http::withHeaders([
            'api_access_token' => $this->apiToken,
        ])->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}/messages", $payload);

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

    public function getTemplates(Request $request)
    {
        $validated = $request->validate([
            'inbox_id' => 'required|integer',
        ]);

        $inboxId = $validated['inbox_id'];
        $url = "{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/inboxes/{$inboxId}/whatsapp_templates";

        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->apiToken,
            ])->get($url);

            if ($response->failed()) {
                $inbox = $this->findInboxById($inboxId);

                return response()->json([
                    'message' => 'Nao foi possivel carregar os templates do WhatsApp no Chatwoot.',
                    'inbox' => $inbox,
                    'details' => $response->json() ?? ['body' => $response->body()],
                    'hint' => $this->buildTemplateFailureHint($response->status(), $inbox),
                ], $response->status());
            }

            $rawTemplates = $response->json('payload', []);

            if (!is_array($rawTemplates)) {
                $rawTemplates = [];
            }

            $templates = collect($rawTemplates)
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
                ->values();

            return response()->json([
                'payload' => $templates,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao consultar templates do WhatsApp.',
                'error' => $e->getMessage(),
            ], 500);
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

    private function buildTemplateFailureHint(int $status, ?array $inbox): string
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

            return 'O Chatwoot respondeu 404 para whatsapp_templates. Isso normalmente indica versao sem suporte a esse endpoint ou inbox incompatível. Verifique a versao do Chatwoot e use o botao "Sincronizar Modelos" na inbox.';
        }

        return 'Confirme se a inbox e do WhatsApp e se os modelos foram sincronizados no painel administrativo do Chatwoot.';
    }
}
