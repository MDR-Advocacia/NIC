<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rules\Password; // Usado para validação de força de senha
use Illuminate\Support\Facades\Password as PasswordFacade; // <--- ADICIONADO (Com Alias para não conflitar)
use Illuminate\Auth\Events\PasswordReset; // <--- ADICIONADO
use Illuminate\Support\Str; // <--- ADICIONADO

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
            'token' => $user->createToken('auth_token')->plainTextToken
        ], 201);
    }

    /**
     * Handle a login request to the application.
     */
    public function login(Request $request)
    {
        // 1. Validação básica
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // 2. Limpeza de dados (Remove espaços em branco antes e depois)
        $email = trim($request->email);
        $password = trim($request->password);

        // 3. Busca o usuário diretamente (sem usar Auth::attempt)
        $user = User::where('email', $email)->first();

        // 4. Verificações explícitas para sabermos ONDE está o erro
        if (! $user) {
            return response()->json([
                'message' => 'Usuário não encontrado no banco de dados com este e-mail.'
            ], 401);
        }

        // 5. Comparação manual do Hash
        if (! Hash::check($password, $user->password)) {
            return response()->json([
                'message' => 'A senha está incorreta.',
                'debug_email' => $email,
            ], 401);
        }

        // 6. Se passou por tudo, gera o token
        $user->tokens()->delete(); // Limpa tokens antigos (opcional)
        
        return response()->json([
            'user' => $user,
            'token' => $user->createToken('auth_token')->plainTextToken
        ]);
    }

    /**
     * Log the user out of the application.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

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

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'A senha atual está incorreta.'], 422);
        }

        if (Hash::check($request->new_password, $user->password)) {
            return response()->json(['message' => 'A nova senha não pode ser igual à atual.'], 422);
        }

        $user->update([
            'password' => Hash::make($request->new_password),
            'must_change_password' => false 
        ]);

        return response()->json(['message' => 'Senha alterada com sucesso! Você já pode navegar no sistema.']);
    }

    // --- NOVOS MÉTODOS PARA RECUPERAÇÃO DE SENHA (ESQUECI MINHA SENHA) ---

    /**
     * 1. Enviar Link de Recuperação por Email
     */
    public function sendResetLinkEmail(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        // Envia o link usando o broker padrão do Laravel
        $status = PasswordFacade::sendResetLink($request->only('email'));

        if ($status === PasswordFacade::RESET_LINK_SENT) {
            return response()->json(['status' => __($status)]);
        }

        // Retorna erro 422 se não conseguir enviar (ex: email não existe)
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

        // Tenta resetar a senha
        $status = PasswordFacade::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password)
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