<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password as PasswordFacade;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private function passwordStatusMessage(string $status): string
    {
        return match ($status) {
            PasswordFacade::RESET_LINK_SENT => 'Enviamos o link de redefinicao para o e-mail informado.',
            PasswordFacade::PASSWORD_RESET => 'Senha redefinida com sucesso.',
            PasswordFacade::INVALID_USER => 'Nao encontramos um usuario ativo com este e-mail.',
            PasswordFacade::INVALID_TOKEN => 'Este link de redefinicao e invalido ou expirou.',
            PasswordFacade::RESET_THROTTLED => 'Aguarde alguns instantes antes de solicitar um novo link.',
            default => __($status),
        };
    }

    private function normalizeLoginEmail(?string $email): string
    {
        $normalized = (string) $email;
        $normalized = preg_replace('/[\x{200B}-\x{200D}\x{FEFF}]/u', '', $normalized) ?? $normalized;
        $normalized = preg_replace('/[\p{Z}\s]+/u', '', $normalized) ?? $normalized;
        $normalized = trim($normalized, " \t\n\r\0\x0B\"'");

        return Str::lower($normalized);
    }

    private function normalizeStoredSecret(?string $value): string
    {
        $normalized = (string) $value;
        $normalized = preg_replace('/[\x{200B}-\x{200D}\x{FEFF}]/u', '', $normalized) ?? $normalized;
        $normalized = preg_replace('/^[\p{Z}\s]+|[\p{Z}\s]+$/u', '', $normalized) ?? $normalized;
        $normalized = trim($normalized, " \t\n\r\0\x0B");

        if (
            strlen($normalized) >= 2
            && (
                (str_starts_with($normalized, '"') && str_ends_with($normalized, '"'))
                || (str_starts_with($normalized, "'") && str_ends_with($normalized, "'"))
            )
        ) {
            $decoded = json_decode($normalized, true);

            if (is_string($decoded) && $decoded !== '') {
                return trim($decoded);
            }

            $normalized = substr($normalized, 1, -1);
        }

        return trim($normalized);
    }

    private function buildPasswordCandidates(?string $password): array
    {
        $raw = (string) $password;
        $candidates = [
            $raw,
            trim($raw),
            $this->normalizeStoredSecret($raw),
        ];

        return array_values(array_unique(array_filter($candidates, static fn ($candidate) => $candidate !== '')));
    }

    /**
     * Handle a registration request for the application.
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('auth_token')->plainTextToken,
        ], 201);
    }

    /**
     * Handle a login request to the application.
     */
    public function login(Request $request)
    {
        $email = $this->normalizeLoginEmail((string) $request->input('email'));
        $password = (string) $request->input('password');
        $passwordCandidates = $this->buildPasswordCandidates($password);

        $request->merge([
            'email' => $email,
        ]);

        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::whereRaw('LOWER(TRIM(email)) = ?', [$email])->first();

        if (! $user) {
            $user = User::query()->get()->first(function (User $candidate) use ($email) {
                return $this->normalizeLoginEmail((string) $candidate->email) === $email;
            });
        }

        if (! $user) {
            return response()->json([
                'message' => 'Usuario nao encontrado no banco de dados com este e-mail.',
            ], 401);
        }

        $normalizedStatus = Str::lower(trim((string) ($user->status ?? 'ativo')));

        if ($normalizedStatus !== 'ativo') {
            return response()->json([
                'message' => 'Sua conta esta inativa. Procure um administrador do sistema.',
            ], 403);
        }

        $storedPassword = $this->normalizeStoredSecret((string) $user->password);
        $passwordMatches = false;
        $mustRehashPassword = false;
        $matchedPassword = $password;

        try {
            foreach ($passwordCandidates as $passwordCandidate) {
                if (Hash::check($passwordCandidate, $storedPassword)) {
                    $passwordMatches = true;
                    $mustRehashPassword = Hash::needsRehash($storedPassword);
                    $matchedPassword = $passwordCandidate;
                    break;
                }
            }
        } catch (\Throwable $exception) {
            $passwordMatches = false;
        }

        // Compatibilidade com contas legadas que possam ter sido migradas sem hash.
        if (! $passwordMatches && $storedPassword !== '') {
            foreach ($passwordCandidates as $passwordCandidate) {
                if (hash_equals($storedPassword, $passwordCandidate)) {
                    $passwordMatches = true;
                    $mustRehashPassword = true;
                    $matchedPassword = $passwordCandidate;
                    break;
                }
            }
        }

        // Compatibilidade adicional com hashes MD5 legados.
        if (! $passwordMatches && preg_match('/^[a-f0-9]{32}$/i', $storedPassword) === 1) {
            foreach ($passwordCandidates as $passwordCandidate) {
                if (hash_equals(Str::lower($storedPassword), md5($passwordCandidate))) {
                    $passwordMatches = true;
                    $mustRehashPassword = true;
                    $matchedPassword = $passwordCandidate;
                    break;
                }
            }
        }

        if (! $passwordMatches) {
            return response()->json([
                'message' => 'A senha esta incorreta.',
                'debug_email' => $email,
            ], 401);
        }

        if ($mustRehashPassword) {
            $user->forceFill([
                'password' => Hash::make($matchedPassword),
            ])->save();
        }

        $user->forceFill([
            'last_login_at' => now(),
        ])->save();

        // Mantemos tokens anteriores para nao derrubar sessoes validas
        // abertas no lab, local ou outros dispositivos da equipe.
        return response()->json([
            'user' => $user,
            'token' => $user->createToken('auth_token')->plainTextToken,
        ]);
    }

    /**
     * Log the user out of the application.
     */
    public function logout(Request $request)
    {
        $token = $request->user()?->currentAccessToken();

        if ($token) {
            $token->delete();
        }

        return response()->json(['message' => 'Logout realizado com sucesso.']);
    }

    /**
     * Alterar senha logado (Change Password)
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => ['required', 'confirmed', 'min:8'],
        ]);

        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'A senha atual esta incorreta.'], 422);
        }

        if (Hash::check($request->new_password, $user->password)) {
            return response()->json(['message' => 'A nova senha nao pode ser igual a atual.'], 422);
        }

        $user->update([
            'password' => Hash::make($request->new_password),
            'must_change_password' => false,
        ]);

        return response()->json(['message' => 'Senha alterada com sucesso! Voce ja pode navegar no sistema.']);
    }

    /**
     * 1. Enviar Link de Recuperacao por Email
     */
    public function sendResetLinkEmail(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $status = PasswordFacade::sendResetLink($request->only('email'));

        if ($status === PasswordFacade::RESET_LINK_SENT) {
            return response()->json(['status' => $this->passwordStatusMessage($status)]);
        }

        return response()->json(['email' => $this->passwordStatusMessage($status)], 422);
    }

    /**
     * 2. Resetar a senha usando o Token
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|confirmed|min:8',
        ]);

        $status = PasswordFacade::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'must_change_password' => false,
                ])->setRememberToken(Str::random(60));

                $user->save();

                event(new PasswordReset($user));
            }
        );

        if ($status === PasswordFacade::PASSWORD_RESET) {
            return response()->json(['status' => $this->passwordStatusMessage($status)]);
        }

        return response()->json(['email' => $this->passwordStatusMessage($status)], 400);
    }
}
