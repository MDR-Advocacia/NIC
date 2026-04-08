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
        $email = Str::lower(trim((string) $request->input('email')));
        $password = (string) $request->input('password');

        $request->merge([
            'email' => $email,
        ]);

        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if (! $user) {
            return response()->json([
                'message' => 'Usuario nao encontrado no banco de dados com este e-mail.',
            ], 401);
        }

        if (($user->status ?? 'ativo') !== 'ativo') {
            return response()->json([
                'message' => 'Sua conta esta inativa. Procure um administrador do sistema.',
            ], 403);
        }

        $storedPassword = trim((string) $user->password);
        $passwordMatches = false;
        $mustRehashPassword = false;

        try {
            $passwordMatches = Hash::check($password, $storedPassword);
            $mustRehashPassword = $passwordMatches && Hash::needsRehash($storedPassword);
        } catch (\Throwable $exception) {
            $passwordMatches = false;
        }

        // Compatibilidade com contas legadas que possam ter sido migradas sem hash.
        if (! $passwordMatches && $storedPassword !== '' && hash_equals($storedPassword, $password)) {
            $passwordMatches = true;
            $mustRehashPassword = true;
        }

        // Compatibilidade adicional com hashes MD5 legados.
        if (! $passwordMatches && preg_match('/^[a-f0-9]{32}$/i', $storedPassword) === 1) {
            $passwordMatches = hash_equals(Str::lower($storedPassword), md5($password));
            $mustRehashPassword = $passwordMatches;
        }

        if (! $passwordMatches) {
            return response()->json([
                'message' => 'A senha esta incorreta.',
                'debug_email' => $email,
            ], 401);
        }

        if ($mustRehashPassword) {
            $user->forceFill([
                'password' => Hash::make($password),
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
            return response()->json(['status' => __($status)]);
        }

        return response()->json(['email' => __($status)], 422);
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
                ])->setRememberToken(Str::random(60));

                $user->save();

                event(new PasswordReset($user));
            }
        );

        if ($status === PasswordFacade::PASSWORD_RESET) {
            return response()->json(['status' => __($status)]);
        }

        return response()->json(['email' => __($status)], 400);
    }
}
