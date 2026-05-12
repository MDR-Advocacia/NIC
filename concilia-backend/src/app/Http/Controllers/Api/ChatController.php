<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\LegalCase;
use App\Models\User;
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
    private $platformApiToken;
    private $accountId;
    private $metaAccessToken;
    private $metaBusinessAccountId;
    private $metaPhoneNumberId;
    private $metaBusinessAccountIdMap;
    private $metaPhoneNumberIdMap;
    private $metaApiVersion;
    private $requestScopedApiToken;
    private $requestScopedChatwootConnectionIssue;

    public function __construct()
    {
        $this->chatwootUrl = rtrim((string) config('app.chatwoot_url'), '/');
        $this->apiToken = config('app.chatwoot_api_token');
        $this->platformApiToken = config('app.chatwoot_platform_api_token');
        $this->accountId = config('app.chatwoot_account_id');
        $this->metaAccessToken = config('services.meta_whatsapp.access_token');
        $this->metaBusinessAccountId = config('services.meta_whatsapp.business_account_id');
        $this->metaPhoneNumberId = config('services.meta_whatsapp.phone_number_id');
        $this->metaBusinessAccountIdMap = $this->parseEnvMap(config('services.meta_whatsapp.business_account_id_map'));
        $this->metaPhoneNumberIdMap = $this->parseEnvMap(config('services.meta_whatsapp.phone_number_id_map'));
        $this->metaApiVersion = config('services.meta_whatsapp.api_version', 'v22.0');
    }

    private function chatwootConfigurationErrorResponse(bool $requireSystemToken = false)
    {
        $missing = [];

        if (blank($this->chatwootUrl)) {
            $missing[] = 'CHATWOOT_URL';
        }

        if ($requireSystemToken && blank($this->apiToken)) {
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
            'hint' => $requireSystemToken
                ? 'Defina as variaveis CHATWOOT_URL, CHATWOOT_API_TOKEN e CHATWOOT_ACCOUNT_ID no ambiente do backend e refaca o deploy.'
                : 'Defina as variaveis CHATWOOT_URL e CHATWOOT_ACCOUNT_ID no ambiente do backend e refaca o deploy.',
        ], 503);
    }

    private function setRequestScopedChatwootApiToken(?string $token): void
    {
        $normalizedToken = trim((string) $token);
        $this->requestScopedApiToken = $normalizedToken !== '' ? $normalizedToken : null;
    }

    private function setRequestScopedChatwootConnectionIssue(?array $issue): void
    {
        $this->requestScopedChatwootConnectionIssue = $issue;
    }

    private function chatwootApiToken(bool $preferSystemToken = false): ?string
    {
        if ($preferSystemToken) {
            return $this->apiToken;
        }

        return $this->requestScopedApiToken;
    }

    private function resolveUserChatwootApiToken(?User $user): ?string
    {
        $token = trim((string) ($user?->chatwoot_access_token ?? ''));
        return $token !== '' ? $token : null;
    }

    private function chatwootConnectionRequiredResponse(Request $request)
    {
        $user = $request->user();
        $hasAgentLink = filled($user?->chatwoot_agent_id);
        $platformConfigured = filled($this->platformApiToken);
        $issue = is_array($this->requestScopedChatwootConnectionIssue) ? $this->requestScopedChatwootConnectionIssue : null;

        $response = [
            'message' => $issue['message'] ?? ($hasAgentLink
                ? 'Sua conta foi encontrada no Chatwoot, mas ainda nao foi possivel liberar a identidade automatica para envio.'
                : 'Nao foi possivel integrar automaticamente sua conta do Chatwoot.'),
            'hint' => $issue['hint'] ?? ($platformConfigured
                ? 'Confirme se existe um agente ativo no Chatwoot com o mesmo e-mail do usuario do NIC.'
                : 'Configure CHATWOOT_PLATFORM_API_TOKEN no backend para o NIC obter automaticamente o token de cada agente sem pedir nada ao colaborador.'),
            'user_email' => $user?->email,
            'agent' => $hasAgentLink ? [
                'id' => $user->chatwoot_agent_id ? (int) $user->chatwoot_agent_id : null,
                'name' => $user->chatwoot_agent_name,
                'email' => $user->chatwoot_agent_email,
                'role' => $user->chatwoot_role,
            ] : null,
            'requires_admin_action' => true,
        ];

        if (filled($issue['code'] ?? null)) {
            $response['reason'] = $issue['code'];
        }

        if (!empty($issue['details'] ?? null)) {
            $response['details'] = $issue['details'];
        }

        return response()->json($response, 409);
    }

    private function bootstrapChatwootTokenForRequest(Request $request, bool $allowSystemFallback = false)
    {
        $this->setRequestScopedChatwootConnectionIssue(null);

        if ($configurationError = $this->chatwootConfigurationErrorResponse($allowSystemFallback)) {
            return $configurationError;
        }

        $user = $request->user();
        $token = $this->resolveUserChatwootApiToken($user);

        if (blank($token) && $user) {
            $user = $this->autoConnectChatwootUser($user);
            $token = $this->resolveUserChatwootApiToken($user);
        }

        if (blank($token) && $allowSystemFallback) {
            $token = $this->apiToken;
        }

        if (blank($token)) {
            return $this->chatwootConnectionRequiredResponse($request);
        }

        $this->setRequestScopedChatwootApiToken($token);

        return null;
    }

    private function findMatchingChatwootAccount(array $profile): ?array
    {
        $targetAccountId = (int) $this->accountId;
        $accounts = collect($profile['accounts'] ?? [])->filter(fn ($account) => is_array($account));

        $match = $accounts->first(fn ($account) => (int) ($account['id'] ?? 0) === $targetAccountId);

        if ($match) {
            return $match;
        }

        if ((int) ($profile['account_id'] ?? 0) === $targetAccountId) {
            return [
                'id' => $targetAccountId,
                'role' => $profile['role'] ?? null,
                'availability_status' => $profile['availability_status'] ?? null,
            ];
        }

        return null;
    }

    private function fetchChatwootProfileFromAccessToken(string $accessToken): array
    {
        $response = Http::withHeaders([
            'api_access_token' => $accessToken,
        ])->get("{$this->chatwootUrl}/api/v1/profile");

        return [
            'response' => $response,
            'status' => $response->status(),
            'details' => $response->json() ?? ['body' => $response->body()],
            'profile' => $response->successful() && is_array($response->json()) ? $response->json() : [],
        ];
    }

    private function normalizeChatwootEmail(?string $email): string
    {
        return Str::lower(trim((string) $email));
    }

    private function usersTableHasColumn(string $column): bool
    {
        static $cache = [];

        if (!array_key_exists($column, $cache)) {
            $cache[$column] = Schema::hasColumn('users', $column);
        }

        return $cache[$column];
    }

    private function chatwootPlatformRoleForUser(User $user): string
    {
        $role = Str::lower(trim((string) $user->role));

        return in_array($role, ['administrador', 'admin', 'supervisor'], true)
            ? 'administrator'
            : 'agent';
    }

    private function buildChatwootPlatformCustomAttributes(User $user): array
    {
        return array_filter([
            'nic_user_id' => $user->id,
            'nic_role' => $user->role,
            'nic_source' => 'nic',
        ], fn ($value) => $value !== null && $value !== '');
    }

    private function generateChatwootProvisioningPassword(): string
    {
        return 'Nic#' . Str::upper(Str::random(4)) . Str::lower(Str::random(4)) . random_int(10, 99) . 'aA!';
    }

    private function setPlatformPermissionIssue(string $code, string $message): void
    {
        $this->setRequestScopedChatwootConnectionIssue([
            'code' => $code,
            'message' => $message,
            'hint' => 'A documentacao oficial informa que a Platform API so acessa objetos criados pela mesma Platform App ou explicitamente permitidos. Se esse account nao foi criado pelo app, libere a permissao no Rails console com PlatformAppPermissible.create!(platform_app: PlatformApp.find(SEU_PLATFORM_APP_ID), permissible: Account.find(SEU_ACCOUNT_ID)).',
            'details' => [
                'configured_account_id' => $this->accountId ? (int) $this->accountId : null,
            ],
        ]);
    }

    private function fetchChatwootPlatformUserProfileById($userId, bool $recordIssue = true): ?array
    {
        if (blank($this->platformApiToken) || blank($userId)) {
            return null;
        }

        $attempts = [
            "{$this->chatwootUrl}/platform/api/v1/users/{$userId}",
            "{$this->chatwootUrl}/api/v1/platform/users/{$userId}",
        ];

        foreach ($attempts as $url) {
            $response = Http::withHeaders(['api_access_token' => $this->platformApiToken])
                ->timeout(10)
                ->get($url);

            if ($response->successful()) {
                $profile = $response->json();
                return is_array($profile) ? $profile : null;
            }

            if (in_array($response->status(), [404, 405], true)) {
                continue;
            }

            Log::warning('Nao foi possivel buscar detalhes do usuario na Platform API do Chatwoot', [
                'chatwoot_user_id' => $userId,
                'url' => $url,
                'status' => $response->status(),
                'details' => $response->json() ?? ['body' => $response->body()],
            ]);

            if ($recordIssue) {
                if ($response->status() === 401) {
                    $this->setPlatformPermissionIssue(
                        'chatwoot_platform_profile_forbidden',
                        'A Platform API do Chatwoot nao conseguiu acessar o usuario vinculado ao NIC.'
                    );
                } else {
                    $this->setRequestScopedChatwootConnectionIssue([
                        'code' => 'chatwoot_platform_profile_failed',
                        'message' => 'O usuario foi localizado no Chatwoot, mas nao foi possivel obter os detalhes da conta para concluir a conexao automatica.',
                        'hint' => 'Confira se o Platform App tem permissao para acessar os detalhes desse usuario no Chatwoot.',
                        'details' => [
                            'chatwoot_user_id' => $userId ? (int) $userId : null,
                        ],
                    ]);
                }
            }

            return null;
        }

        return null;
    }

    private function fetchChatwootPlatformAccountUsers(): ?array
    {
        if (blank($this->platformApiToken) || blank($this->accountId)) {
            return null;
        }

        $response = Http::withHeaders(['api_access_token' => $this->platformApiToken])
            ->timeout(10)
            ->get("{$this->chatwootUrl}/platform/api/v1/accounts/{$this->accountId}/account_users");

        if ($response->successful()) {
            $payload = $response->json();
            return is_array($payload) ? array_values(array_filter($payload, 'is_array')) : [];
        }

        Log::warning('Nao foi possivel listar os account_users do Chatwoot pela Platform API', [
            'account_id' => $this->accountId,
            'status' => $response->status(),
            'details' => $response->json() ?? ['body' => $response->body()],
        ]);

        if ($response->status() === 401) {
            $this->setPlatformPermissionIssue(
                'chatwoot_platform_account_forbidden',
                'A Platform API do Chatwoot nao tem permissao para listar os usuarios do account configurado no NIC.'
            );
        } else {
            $this->setRequestScopedChatwootConnectionIssue([
                'code' => 'chatwoot_platform_account_users_failed',
                'message' => 'Nao foi possivel consultar os usuarios do account na Platform API do Chatwoot.',
                'hint' => 'Confira se o CHATWOOT_PLATFORM_API_TOKEN esta correto e se o account configurado esta acessivel por essa Platform App.',
                'details' => [
                    'configured_account_id' => $this->accountId ? (int) $this->accountId : null,
                ],
            ]);
        }

        return null;
    }

    private function syncChatwootPlatformUser(User $user, array $profile): ?array
    {
        $userId = isset($profile['id']) ? (int) $profile['id'] : null;

        if (!$userId) {
            return $profile;
        }

        $desiredEmail = trim((string) $user->email);
        $desiredName = trim((string) $user->name);
        $currentCustomAttributes = is_array($profile['custom_attributes'] ?? null) ? $profile['custom_attributes'] : [];
        $desiredCustomAttributes = array_merge($currentCustomAttributes, $this->buildChatwootPlatformCustomAttributes($user));

        $needsSync = $this->normalizeChatwootEmail($profile['email'] ?? null) !== $this->normalizeChatwootEmail($desiredEmail)
            || trim((string) ($profile['name'] ?? '')) !== $desiredName
            || trim((string) ($profile['display_name'] ?? '')) !== $desiredName
            || (string) data_get($profile, 'custom_attributes.nic_user_id') !== (string) $user->id
            || (string) data_get($profile, 'custom_attributes.nic_role') !== (string) $user->role;

        if (!$needsSync) {
            return $profile;
        }

        $response = Http::withHeaders([
            'api_access_token' => $this->platformApiToken,
            'Content-Type' => 'application/json',
        ])
            ->timeout(10)
            ->patch("{$this->chatwootUrl}/platform/api/v1/users/{$userId}", [
                'name' => $desiredName,
                'display_name' => $desiredName,
                'email' => $desiredEmail,
                'custom_attributes' => $desiredCustomAttributes,
            ]);

        if ($response->successful() && is_array($response->json())) {
            return $response->json();
        }

        Log::warning('Nao foi possivel sincronizar o usuario gerenciado pelo NIC na Platform API do Chatwoot', [
            'chatwoot_user_id' => $userId,
            'status' => $response->status(),
            'details' => $response->json() ?? ['body' => $response->body()],
        ]);

        $this->setRequestScopedChatwootConnectionIssue([
            'code' => 'chatwoot_user_sync_failed',
            'message' => 'O usuario foi encontrado no Chatwoot, mas nao foi possivel sincronizar seus dados com a Platform API.',
            'hint' => 'Confira se esse usuario foi criado pela mesma Platform App usada pelo NIC e se o e-mail nao conflita com outro cadastro manual do Chatwoot.',
            'details' => [
                'chatwoot_user_id' => $userId,
                'user_email' => $user->email,
            ],
        ]);

        return null;
    }

    private function createChatwootPlatformUser(User $user): ?array
    {
        $response = Http::withHeaders([
            'api_access_token' => $this->platformApiToken,
            'Content-Type' => 'application/json',
        ])
            ->timeout(10)
            ->post("{$this->chatwootUrl}/platform/api/v1/users", [
                'name' => $user->name,
                'display_name' => $user->name,
                'email' => $user->email,
                'password' => $this->generateChatwootProvisioningPassword(),
                'custom_attributes' => $this->buildChatwootPlatformCustomAttributes($user),
            ]);

        if ($response->successful() && is_array($response->json())) {
            return $response->json();
        }

        $details = $response->json() ?? ['body' => $response->body()];
        $errorText = $this->extractErrorText($details);

        Log::warning('Nao foi possivel provisionar usuario do NIC na Platform API do Chatwoot', [
            'user_email' => $user->email,
            'status' => $response->status(),
            'details' => $details,
        ]);

        if (in_array($response->status(), [409, 422], true)) {
            $this->setRequestScopedChatwootConnectionIssue([
                'code' => 'chatwoot_user_provisioning_conflict',
                'message' => "Ja existe um usuario no Chatwoot com o e-mail {$user->email}, mas ele nao esta sob o controle desta Platform App do NIC.",
                'hint' => 'Como a documentacao do Chatwoot limita a Platform API aos objetos criados pela mesma Platform App, o caminho profissional e provisionar todos os agentes do NIC por esta Platform App, em vez de cria-los manualmente pela UI.',
                'details' => [
                    'user_email' => $user->email,
                    'chatwoot_error' => $errorText ?: $details,
                ],
            ]);
        } elseif ($response->status() === 401) {
            $this->setPlatformPermissionIssue(
                'chatwoot_user_provisioning_forbidden',
                'A Platform API do Chatwoot nao conseguiu criar o usuario do NIC no ambiente atual.'
            );
        } else {
            $this->setRequestScopedChatwootConnectionIssue([
                'code' => 'chatwoot_user_provisioning_failed',
                'message' => 'Nao foi possivel criar automaticamente o usuario do NIC no Chatwoot.',
                'hint' => 'Confira o token da Platform App e se a instalacao self-hosted do Chatwoot esta aceitando criacao de usuarios por Platform API.',
                'details' => [
                    'user_email' => $user->email,
                    'chatwoot_error' => $errorText ?: $details,
                ],
            ]);
        }

        return null;
    }

    private function ensureChatwootPlatformAccountMembership(User $user, array $profile): ?array
    {
        if ($this->findMatchingChatwootAccount($profile)) {
            return $profile;
        }

        $userId = isset($profile['id']) ? (int) $profile['id'] : null;

        if (!$userId) {
            return null;
        }

        $response = Http::withHeaders([
            'api_access_token' => $this->platformApiToken,
            'Content-Type' => 'application/json',
        ])
            ->timeout(10)
            ->post("{$this->chatwootUrl}/platform/api/v1/accounts/{$this->accountId}/account_users", [
                'user_id' => $userId,
                'role' => $this->chatwootPlatformRoleForUser($user),
            ]);

        if ($response->failed()) {
            Log::warning('Nao foi possivel vincular o usuario do NIC ao account do Chatwoot pela Platform API', [
                'chatwoot_user_id' => $userId,
                'account_id' => $this->accountId,
                'status' => $response->status(),
                'details' => $response->json() ?? ['body' => $response->body()],
            ]);

            if ($response->status() === 401) {
                $this->setPlatformPermissionIssue(
                    'chatwoot_account_membership_forbidden',
                    'A Platform API do Chatwoot nao tem permissao para adicionar o usuario ao account configurado no NIC.'
                );
            } else {
                $this->setRequestScopedChatwootConnectionIssue([
                    'code' => 'chatwoot_account_membership_failed',
                    'message' => 'O usuario foi criado no Chatwoot, mas nao foi possivel adiciona-lo ao account usado pelo NIC.',
                    'hint' => 'Confirme se o CHATWOOT_ACCOUNT_ID esta correto e se a Platform App tem permissao sobre esse account.',
                    'details' => [
                        'configured_account_id' => $this->accountId ? (int) $this->accountId : null,
                        'chatwoot_user_id' => $userId,
                    ],
                ]);
            }

            return null;
        }

        return $this->fetchChatwootPlatformUserProfileById($userId, false) ?? $profile;
    }

    private function findChatwootPlatformUserInAccount(User $user): ?array
    {
        $accountUsers = $this->fetchChatwootPlatformAccountUsers();

        if ($accountUsers === null) {
            return null;
        }

        $normalizedEmail = $this->normalizeChatwootEmail($user->email);

        foreach ($accountUsers as $accountUser) {
            $candidateId = (int) ($accountUser['user_id'] ?? 0);

            if ($candidateId <= 0) {
                continue;
            }

            $profile = $this->fetchChatwootPlatformUserProfileById($candidateId, false);

            if (!$profile) {
                continue;
            }

            if ((string) data_get($profile, 'custom_attributes.nic_user_id') === (string) $user->id) {
                return $profile;
            }

            if ($normalizedEmail !== '' && $this->normalizeChatwootEmail($profile['email'] ?? null) === $normalizedEmail) {
                return $profile;
            }
        }

        return null;
    }

    private function resolveManagedChatwootPlatformUser(User $user): ?array
    {
        $storedPlatformUserId = $this->usersTableHasColumn('chatwoot_user_id')
            ? (int) ($user->chatwoot_user_id ?? 0)
            : 0;

        if ($storedPlatformUserId > 0) {
            $profile = $this->fetchChatwootPlatformUserProfileById($storedPlatformUserId, false);

            if ($profile) {
                $profile = $this->syncChatwootPlatformUser($user, $profile);
                return $profile ? $this->ensureChatwootPlatformAccountMembership($user, $profile) : null;
            }
        }

        $profile = $this->findChatwootPlatformUserInAccount($user);

        if ($profile) {
            $profile = $this->syncChatwootPlatformUser($user, $profile);
            return $profile ? $this->ensureChatwootPlatformAccountMembership($user, $profile) : null;
        }

        $profile = $this->createChatwootPlatformUser($user);

        if (!$profile) {
            return null;
        }

        $profile = $this->ensureChatwootPlatformAccountMembership($user, $profile);

        if (!$profile) {
            return null;
        }

        return $this->syncChatwootPlatformUser($user, $profile) ?? $profile;
    }

    private function formatChatwootConnectionStatus(User $user): array
    {
        $hasAgent = filled($user->chatwoot_agent_id);

        return [
            'connected' => (bool) $user->chatwoot_connected,
            'integration_mode' => $user->chatwoot_connected ? 'automatic_user_token' : ($hasAgent ? 'agent_found_without_token' : 'pending'),
            'automatic_sync_available' => filled($this->platformApiToken),
            'chatwoot_url' => $this->chatwootUrl,
            'chatwoot_account_id' => $this->accountId ? (int) $this->accountId : null,
            'agent' => $hasAgent ? [
                'id' => $user->chatwoot_agent_id ? (int) $user->chatwoot_agent_id : null,
                'name' => $user->chatwoot_agent_name,
                'email' => $user->chatwoot_agent_email,
                'role' => $user->chatwoot_role,
            ] : null,
            'connected_at' => $user->chatwoot_connected_at?->toIso8601String(),
            'last_validated_at' => $user->chatwoot_last_validated_at?->toIso8601String(),
        ];
    }

    private function storeChatwootConnection(User $user, string $accessToken, array $profile): User
    {
        $matchingAccount = $this->findMatchingChatwootAccount($profile);
        $agentName = data_get($profile, 'available_name')
            ?: data_get($profile, 'display_name')
            ?: data_get($profile, 'name')
            ?: $user->name;

        $attributes = [
            'chatwoot_access_token' => trim($accessToken),
            'chatwoot_agent_id' => isset($profile['id']) ? (int) $profile['id'] : ($user->chatwoot_agent_id ? (int) $user->chatwoot_agent_id : null),
            'chatwoot_agent_name' => $agentName,
            'chatwoot_agent_email' => data_get($profile, 'email'),
            'chatwoot_account_id' => $matchingAccount['id'] ?? ($this->accountId ? (int) $this->accountId : null),
            'chatwoot_role' => $matchingAccount['role'] ?? data_get($profile, 'role'),
            'chatwoot_connected_at' => now(),
            'chatwoot_last_validated_at' => now(),
        ];

        if ($this->usersTableHasColumn('chatwoot_user_id')) {
            $attributes['chatwoot_user_id'] = isset($profile['id']) ? (int) $profile['id'] : null;
        }

        $user->forceFill($attributes)->save();

        return $user->fresh();
    }

    private function autoConnectChatwootUser(User $user): User
    {
        $this->setRequestScopedChatwootConnectionIssue(null);

        if ($user->chatwoot_connected) {
            return $user;
        }

        if (blank($this->platformApiToken)) {
            return $user;
        }

        $nicEmail = $this->normalizeChatwootEmail($user->email);

        if ($nicEmail === '') {
            $this->setRequestScopedChatwootConnectionIssue([
                'code' => 'chatwoot_missing_user_email',
                'message' => 'O usuario logado no NIC nao possui um e-mail valido para localizar a conta correspondente no Chatwoot.',
                'hint' => 'Atualize o e-mail desse colaborador no NIC e garanta que ele seja igual ao e-mail cadastrado no Chatwoot.',
            ]);

            return $user;
        }

        $platformUser = $this->resolveManagedChatwootPlatformUser($user);

        if (!$platformUser) {
            if (!$this->requestScopedChatwootConnectionIssue) {
                $this->setRequestScopedChatwootConnectionIssue([
                    'code' => 'chatwoot_user_not_ready',
                    'message' => 'O NIC nao conseguiu localizar nem provisionar automaticamente o usuario no Chatwoot.',
                    'hint' => 'Garanta que o account esteja permitido para a Platform App e que os usuarios do NIC passem a ser provisionados por ela.',
                    'details' => [
                        'user_email' => $user->email,
                    ],
                ]);
            }

            return $user;
        }

        $accessToken = trim((string) ($platformUser['access_token'] ?? ''));

        if ($accessToken === '') {
            $this->setRequestScopedChatwootConnectionIssue([
                'code' => 'chatwoot_access_token_missing',
                'message' => 'O usuario foi provisionado no Chatwoot, mas a Platform API nao retornou um access_token pessoal para ele.',
                'hint' => 'Confirme se esse usuario foi criado pela mesma Platform App usada pelo NIC e se o endpoint oficial de detalhes do usuario esta retornando access_token.',
                'details' => [
                    'chatwoot_user_id' => $platformUser['id'] ?? null,
                    'user_email' => $user->email,
                ],
            ]);

            return $user;
        }

        $profileResponse = $this->fetchChatwootProfileFromAccessToken($accessToken);

        if (($profileResponse['response'] ?? null)?->failed()) {
            $this->setRequestScopedChatwootConnectionIssue([
                'code' => 'chatwoot_user_token_validation_failed',
                'message' => 'O usuario foi provisionado no Chatwoot, mas o access_token retornado nao conseguiu autenticar na API de aplicacao.',
                'hint' => 'Confira se o usuario esta ativo no account configurado e se o Chatwoot nao revogou o token retornado pela Platform API.',
                'details' => [
                    'chatwoot_user_id' => $platformUser['id'] ?? null,
                    'chatwoot_error' => $profileResponse['details'] ?? null,
                ],
            ]);

            return $user;
        }

        $profile = $profileResponse['profile'] ?? [];
        $platformEmail = $this->normalizeChatwootEmail($profile['email'] ?? ($platformUser['email'] ?? null));
        $matchingAccount = $this->findMatchingChatwootAccount($profile);

        if ($platformEmail !== '' && $nicEmail !== '' && $platformEmail !== $nicEmail) {
            $this->setRequestScopedChatwootConnectionIssue([
                'code' => 'chatwoot_email_mismatch',
                'message' => 'O usuario provisionado no Chatwoot possui um e-mail diferente do usuario logado no NIC.',
                'hint' => 'Revise o cadastro para que os dois sistemas usem exatamente o mesmo e-mail.',
                'details' => [
                    'nic_email' => $nicEmail,
                    'chatwoot_email' => $platformEmail,
                    'chatwoot_user_id' => $platformUser['id'] ?? null,
                ],
            ]);

            return $user;
        }

        if (!$matchingAccount) {
            $this->setRequestScopedChatwootConnectionIssue([
                'code' => 'chatwoot_account_mismatch',
                'message' => 'O usuario foi provisionado no Chatwoot, mas ainda nao aparece vinculado ao account configurado no NIC.',
                'hint' => 'Confirme se o CHATWOOT_ACCOUNT_ID esta correto e se a Platform App conseguiu criar o account_user desse colaborador.',
                'details' => [
                    'configured_account_id' => $this->accountId ? (int) $this->accountId : null,
                    'chatwoot_user_id' => $platformUser['id'] ?? null,
                ],
            ]);

            return $user;
        }

        return $this->storeChatwootConnection($user, $accessToken, $profile);
    }

    private function clearChatwootConnection(User $user): User
    {
        $attributes = [
            'chatwoot_access_token' => null,
            'chatwoot_agent_id' => null,
            'chatwoot_agent_name' => null,
            'chatwoot_agent_email' => null,
            'chatwoot_account_id' => null,
            'chatwoot_role' => null,
            'chatwoot_connected_at' => null,
            'chatwoot_last_validated_at' => null,
        ];

        if ($this->usersTableHasColumn('chatwoot_user_id')) {
            $attributes['chatwoot_user_id'] = null;
        }

        $user->forceFill($attributes)->save();

        return $user->fresh();
    }

    public function getConnectionStatus(Request $request)
    {
        $user = $request->user();
        $needsAutoSync = !$user?->chatwoot_connected;

        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

        if ($needsAutoSync && $user) {
            $user = $this->autoConnectChatwootUser($user);
        }

        return response()->json($this->formatChatwootConnectionStatus($user));
    }

    public function updateConnection(Request $request)
    {
        if ($configurationError = $this->chatwootConfigurationErrorResponse()) {
            return $configurationError;
        }

        $validated = $request->validate([
            'chatwoot_access_token' => 'required|string',
        ]);

        $providedToken = trim((string) $validated['chatwoot_access_token']);
        $profileResponse = $this->fetchChatwootProfileFromAccessToken($providedToken);

        if (($profileResponse['response'] ?? null)?->failed()) {
            return response()->json([
                'message' => 'Nao foi possivel validar o access_token informado no Chatwoot.',
                'details' => $profileResponse['details'] ?? null,
            ], 422);
        }

        $profile = $profileResponse['profile'] ?? [];
        $matchingAccount = $this->findMatchingChatwootAccount($profile);

        if (!$matchingAccount) {
            return response()->json([
                'message' => 'A conta do Chatwoot informada nao tem acesso ao account configurado no NIC.',
                'details' => [
                    'configured_account_id' => $this->accountId ? (int) $this->accountId : null,
                    'profile_account_id' => $profile['account_id'] ?? null,
                ],
            ], 422);
        }

        $nicEmail = Str::lower(trim((string) ($request->user()?->email ?? '')));
        $chatwootEmail = Str::lower(trim((string) ($profile['email'] ?? '')));

        if ($nicEmail !== '' && $chatwootEmail !== '' && $nicEmail !== $chatwootEmail) {
            return response()->json([
                'message' => 'O token informado pertence a outro e-mail no Chatwoot. Use a conta correspondente ao usuario do NIC.',
                'details' => [
                    'nic_email' => $nicEmail,
                    'chatwoot_email' => $chatwootEmail,
                ],
            ], 422);
        }

        $user = $this->storeChatwootConnection($request->user(), $providedToken, $profile);

        return response()->json([
            'message' => 'Conta do Chatwoot conectada com sucesso.',
            'user' => $user,
            'connection' => $this->formatChatwootConnectionStatus($user),
        ]);
    }

    public function disconnectConnection(Request $request)
    {
        $user = $this->clearChatwootConnection($request->user());

        return response()->json([
            'message' => 'Conta do Chatwoot desconectada com sucesso.',
            'user' => $user,
            'connection' => $this->formatChatwootConnectionStatus($user),
        ]);
    }

    public function getContacts(Request $request)
    {
        if ($tokenBootstrap = $this->bootstrapChatwootTokenForRequest($request)) {
            return $tokenBootstrap;
        }

        $search = $request->query('search');

        $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
            ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts", [
                'search' => $search,
            ]);

        return response()->json($response->json());
    }

    public function resolveConversation(Request $request, $conversationId)
    {
        if ($tokenBootstrap = $this->bootstrapChatwootTokenForRequest($request)) {
            return $tokenBootstrap;
        }

        $response = Http::withHeaders([
            'api_access_token' => $this->chatwootApiToken(),
        ])->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}/toggle_status", [
            'status' => 'resolved',
        ]);

        return response()->json($response->json());
    }

    public function createContact(Request $request)
    {
        if ($tokenBootstrap = $this->bootstrapChatwootTokenForRequest($request)) {
            return $tokenBootstrap;
        }

        $validated = Validator::make($this->buildContactPayload($request), [
            'name' => 'required|string',
            'email' => 'nullable|email',
            'phone_number' => 'nullable|string',
            'inbox_id' => 'required|integer',
        ])->validate();

        $payload = $this->buildChatwootContactCreatePayload($validated);
        $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
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
        if ($tokenBootstrap = $this->bootstrapChatwootTokenForRequest($request)) {
            return $tokenBootstrap;
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

        $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
            ->put("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts/{$contactId}", $payload);

        return response()->json($response->json() ?: ['success' => $response->successful()], $response->status());
    }

    public function destroyContact(Request $request, $contactId)
    {
        if ($tokenBootstrap = $this->bootstrapChatwootTokenForRequest($request)) {
            return $tokenBootstrap;
        }

        $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
            ->delete("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts/{$contactId}");

        return response()->json($response->json() ?: ['success' => $response->successful()], $response->status());
    }

    public function createConversationForContact(Request $request, $contactId)
    {
        if ($tokenBootstrap = $this->bootstrapChatwootTokenForRequest($request)) {
            return $tokenBootstrap;
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

        $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
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

    public function getInboxAgents(Request $request, $inboxId)
    {
        if ($tokenBootstrap = $this->bootstrapChatwootTokenForRequest($request)) {
            return $tokenBootstrap;
        }

        $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
            ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/inbox_members/{$inboxId}");

        $data = $response->json();

        return response()->json($data['payload'] ?? $data, $response->status());
    }

    public function getAccountAgents(Request $request)
    {
        if ($tokenBootstrap = $this->bootstrapChatwootTokenForRequest($request)) {
            return $tokenBootstrap;
        }

        $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
            ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/agents");

        $data = $response->json();

        return response()->json($data['payload'] ?? $data, $response->status());
    }

    public function addAgentToInbox(Request $request, $inboxId)
    {
        if ($tokenBootstrap = $this->bootstrapChatwootTokenForRequest($request)) {
            return $tokenBootstrap;
        }

        $validated = $request->validate([
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'integer',
        ]);

        $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
            ->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/inbox_members", [
                'inbox_id' => (int) $inboxId,
                'user_ids' => array_values($validated['user_ids']),
            ]);

        return response()->json($response->json() ?: ['success' => $response->successful()], $response->status());
    }

    public function assignConversation(Request $request, $conversationId)
    {
        if ($tokenBootstrap = $this->bootstrapChatwootTokenForRequest($request)) {
            return $tokenBootstrap;
        }

        $validated = $request->validate([
            'assignee_id' => 'nullable|integer',
        ]);

        $response = Http::withHeaders([
            'api_access_token' => $this->chatwootApiToken(),
        ])->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}/assignments", [
            'assignee_id' => $validated['assignee_id'] ?? null,
        ]);

        return response()->json($response->json() ?: ['success' => $response->successful()], $response->status());
    }

    public function getConversations(Request $request)
    {
        if ($tokenBootstrap = $this->bootstrapChatwootTokenForRequest($request)) {
            return $tokenBootstrap;
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
            $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
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

    public function getInboxes(Request $request)
    {
        if ($tokenBootstrap = $this->bootstrapChatwootTokenForRequest($request)) {
            return $tokenBootstrap;
        }

        $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
            ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/inboxes");

        $data = $response->json();

        return response()->json($data['payload'] ?? $data);
    }

    public function getMyInboxes(Request $request)
    {
        if ($tokenBootstrap = $this->bootstrapChatwootTokenForRequest($request)) {
            return $tokenBootstrap;
        }

        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootApiToken(),
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

    public function getConversationMessages(Request $request, $conversationId)
    {
        if ($tokenBootstrap = $this->bootstrapChatwootTokenForRequest($request)) {
            return $tokenBootstrap;
        }

        $response = Http::withHeaders([
            'api_access_token' => $this->chatwootApiToken(),
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
        if ($tokenBootstrap = $this->bootstrapChatwootTokenForRequest($request)) {
            return $tokenBootstrap;
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
            'api_access_token' => $this->chatwootApiToken(),
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
            'api_access_token' => $this->chatwootApiToken(),
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
        if ($tokenBootstrap = $this->bootstrapChatwootTokenForRequest($request)) {
            return $tokenBootstrap;
        }

        $validated = $request->validate([
            'inbox_id' => 'required|integer',
        ]);

        $inboxId = (int) $validated['inbox_id'];
        $url = "{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/inboxes/{$inboxId}/whatsapp_templates";

        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootApiToken(),
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
        $contactResponse = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
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
        $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
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
        $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
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
        $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
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
        if ($request->user()?->chatwoot_agent_id) {
            return (int) $request->user()->chatwoot_agent_id;
        }

        $email = Str::lower(trim((string) ($request->user()?->email ?? '')));

        if ($email === '') {
            return null;
        }

        return Cache::remember("chatwoot:account:{$this->accountId}:agent_id_by_email:{$email}", now()->addMinutes(10), function () use ($email) {
            $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
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

        $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
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
            $validated['phone_number'] ?? null,
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
            $matches = $matches->merge($this->fetchContactsBySearchTerm($term));
        }

        $filteredMatches = $this->filterEquivalentContacts($matches, $validated);

        if (!empty($filteredMatches)) {
            return $filteredMatches;
        }

        if ($phoneDigits !== '') {
            $matches = $matches->merge($this->fetchContactsByFilter('phone_number', $normalizedPhone));
            $matches = $matches->merge($this->fetchContactsByFilter('identifier', $normalizedPhone));
            $matches = $matches->merge($this->fetchContactsByPages(6));
        }

        return $this->filterEquivalentContacts($matches, $validated);
    }

    private function fetchContactsBySearchTerm(string $term): array
    {
        $matches = collect();

        foreach ([
            ['path' => 'contacts/search', 'params' => ['q' => $term]],
            ['path' => 'contacts', 'params' => ['search' => $term]],
        ] as $attempt) {
            $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
                ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/{$attempt['path']}", $attempt['params']);

            if ($response->failed()) {
                continue;
            }

            $matches = $matches->merge($this->extractChatwootContactsList($response->json()));
        }

        return $matches->filter(fn ($contact) => is_array($contact))->values()->all();
    }

    private function fetchContactsByFilter(string $attributeKey, ?string $value): array
    {
        if (blank($value)) {
            return [];
        }

        $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
            ->post("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts/filter", [
                'payload' => [
                    [
                        'attribute_key' => $attributeKey,
                        'filter_operator' => 'equal_to',
                        'values' => [$value],
                        'query_operator' => null,
                    ],
                ],
            ]);

        if ($response->failed()) {
            return [];
        }

        return collect($this->extractChatwootContactsList($response->json()))
            ->filter(fn ($contact) => is_array($contact))
            ->values()
            ->all();
    }

    private function fetchContactsByPages(int $pages): array
    {
        $matches = collect();

        for ($page = 1; $page <= $pages; $page++) {
            $response = Http::withHeaders(['api_access_token' => $this->chatwootApiToken()])
                ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts", [
                    'page' => $page,
                ]);

            if ($response->failed()) {
                continue;
            }

            $contacts = $this->extractChatwootContactsList($response->json());

            if (empty($contacts)) {
                break;
            }

            $matches = $matches->merge($contacts);
        }

        return $matches->filter(fn ($contact) => is_array($contact))->values()->all();
    }

    private function filterEquivalentContacts($contacts, array $validated): array
    {
        return collect($contacts)
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
                'api_access_token' => $this->chatwootApiToken(),
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
