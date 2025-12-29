<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Hash; // <--- Apenas uma vez!
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rules\Password;

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
                'debug_email' => $email, // Para você ver se está chegando certo
                // 'debug_hash' => $user->password // Descomente se quiser ver o hash
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
    public function changePassword(Request $request)
{
    $request->validate([
        'current_password' => 'required',
        'new_password' => ['required', 'confirmed', 'min:8'], // confirmed busca por new_password_confirmation
    ]);

    $user = $request->user();

    // Verifica se a senha atual bate com o banco
    if (!Hash::check($request->current_password, $user->password)) {
        return response()->json(['message' => 'A senha atual está incorreta.'], 422);
    }
    // 2. NOVO: Verifica se a nova senha é IGUAL à antiga (Bloqueio)
        if (Hash::check($request->new_password, $user->password)) {
            return response()->json(['message' => 'A nova senha não pode ser igual à atual.'], 422);
        }

    // Atualiza
    $user->update([
        'password' => Hash::make($request->new_password)
    ]);

    return response()->json(['message' => 'Senha alterada com sucesso!']);
}
}