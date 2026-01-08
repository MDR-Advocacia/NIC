<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB; // Adicionado para transações em lote
use Illuminate\Validation\Rule;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class UserController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        // 1. Policy permite a entrada (agora inclui operador)
        $this->authorize('viewAny', User::class);

        $query = User::with('department');
        $currentUser = auth()->user();

        // 2. FILTRO DE SEGURANÇA:
        // Se for operador, forçamos a query a retornar APENAS ele mesmo.
        if ($currentUser->role === 'operador') {
            $query->where('id', $currentUser->id);
        }

        // Filtros normais (search, status, etc)
        if ($request->has('search') && $request->input('search') != '') {
            $searchTerm = $request->input('search');
            $query->where(function($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                  ->orWhere('email', 'like', "%{$searchTerm}%");
            });
        }
        if ($request->has('status') && $request->input('status') != '') {
            $query->where('status', $request->input('status'));
        }
        if ($request->has('role') && $request->input('role') != '') {
            $query->where('role', $request->input('role'));
        }
        if ($request->has('department_id') && $request->input('department_id') != '') {
            $query->where('department_id', $request->input('department_id'));
        }
        if ($request->has('area') && $request->input('area') != '') {
            $query->where('area', $request->input('area'));
        }

        // --- ALTERAÇÃO DA TASK #22 ---
        // Alterado de get() para paginate(15)
        // O Laravel estrutura automaticamente o JSON com 'data', 'current_page', etc.
        return response()->json($query->paginate(15));
    }

    public function store(Request $request)
    {
        $this->authorize('create', User::class);

        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:administrador,supervisor,operador',
            'department_id' => 'required|exists:departments,id',
            'phone' => 'nullable|string',
            'status' => 'required|string|in:ativo,inativo',
            'area'   => 'nullable|string',
        ]);

        // 1. Hash da senha
        $validatedData['password'] = Hash::make($validatedData['password']);

        // 2. CORREÇÃO: Força o usuário a trocar a senha no primeiro login
        $validatedData['must_change_password'] = true; 

        // 3. Cria o usuário com a flag ativada
        $user = User::create($validatedData);

        try {
            AuditLog::create([
                'user_id' => auth()->id(),
                'user_name' => auth()->user() ? auth()->user()->name : 'Sistema',
                'action' => 'Criação de Usuário',
                'details' => "Criou o usuário: {$user->name}",
                'ip_address' => $request->ip(),
            ]);
        } catch (\Exception $e) {
            Log::error("ERRO AO SALVAR LOG (Criação): " . $e->getMessage());
        }

        return response()->json($user, 201);
    }

    public function update(Request $request, User $user)
    {
        $this->authorize('update', $user);

        $validatedData = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('users')->ignore($user->id)],
            'password' => 'nullable|string|min:8',
            'role' => 'sometimes|required|string|in:administrador,supervisor,operador',
            'department_id' => 'sometimes|required|exists:departments,id',
            'phone' => 'nullable|string',
            'status' => 'sometimes|required|string|in:ativo,inativo',
            'area'   => 'nullable|string',
        ]);

        if (isset($validatedData['password']) && !empty($validatedData['password'])) {
            $validatedData['password'] = Hash::make($validatedData['password']);
        } else {
            unset($validatedData['password']);
        }

        $user->update($validatedData);

        try {
            AuditLog::create([
                'user_id' => auth()->id(),
                'user_name' => auth()->user() ? auth()->user()->name : 'Sistema',
                'action' => 'Edição de Usuário',
                'details' => "Editou o usuário: {$user->name} ({$user->email})",
                'ip_address' => $request->ip(),
            ]);
        } catch (\Exception $e) {
            Log::error("ERRO AO SALVAR LOG (Edição): " . $e->getMessage());
        }

        return response()->json($user);
    }

    public function destroy(User $user)
    {
        $this->authorize('delete', $user);

        $deletedInfo = "{$user->name} ({$user->email})"; 
        $user->delete();

        try {
            AuditLog::create([
                'user_id' => auth()->id(),
                'user_name' => auth()->user() ? auth()->user()->name : 'Sistema',
                'action' => 'Exclusão de Usuário',
                'details' => "Excluiu o usuário: {$deletedInfo}",
                'ip_address' => request()->ip(), // Ajustado para helper global pois $request não é injetado aqui diretamente
            ]);
        } catch (\Exception $e) {
            Log::error("ERRO AO SALVAR LOG (Exclusão): " . $e->getMessage());
        }

        return response()->json(null, 204);
    }

    /**
     * Atualização em Lote de Usuários
     * Permite alterar status, cargo, área ou excluir múltiplos usuários.
     */
    public function batchUpdate(Request $request)
    {
        // Requer permissão de admin ou similar (ajuste conforme suas Policies)
        $this->authorize('create', User::class); 

        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
            'action' => 'required|string|in:update_status,update_role,update_area,delete',
            'value' => 'nullable', // Pode ser string (cargo, area, status)
        ]);

        $userIds = $validated['user_ids'];
        $action = $validated['action'];
        $value = $validated['value'];

        // Proteção: Não permitir que o usuário altere seu próprio status/role ou se exclua em lote
        if (in_array(auth()->id(), $userIds)) {
             // Remove o ID do próprio usuário da lista se a ação for destrutiva ou de bloqueio
             if (in_array($action, ['delete', 'update_status'])) {
                 return response()->json(['message' => 'Segurança: Você não pode alterar seu próprio status ou excluir sua conta via ação em lote.'], 403);
             }
        }

        DB::beginTransaction();
        try {
            $query = User::whereIn('id', $userIds);
            $count = $query->count();
            $logDetails = "";

            switch ($action) {
                case 'update_status':
                    // Espera 'ativo' ou 'inativo'
                    $query->update(['status' => $value]);
                    $logDetails = "Alterou status de {$count} usuários para '{$value}'";
                    break;

                case 'update_role':
                    // Espera 'administrador', 'supervisor', etc.
                    $query->update(['role' => $value]);
                    $logDetails = "Alterou cargo de {$count} usuários para '{$value}'";
                    break;
                
                case 'update_area':
                    $query->update(['area' => $value]);
                    $logDetails = "Alterou área de {$count} usuários para '{$value}'";
                    break;

                case 'delete':
                    $query->delete();
                    $logDetails = "Excluiu {$count} usuários em lote";
                    break;
            }

            // Registrar no AuditLog usando o padrão existente no controller
            AuditLog::create([
                'user_id' => auth()->id(),
                'user_name' => auth()->user() ? auth()->user()->name : 'Sistema',
                'action' => 'Ação em Lote (Usuários)',
                'details' => $logDetails . " (IDs afetados: " . implode(', ', $userIds) . ")",
                'ip_address' => $request->ip(),
            ]);

            DB::commit();
            return response()->json(['message' => 'Ação em lote realizada com sucesso.', 'affected_count' => $count]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("ERRO BATCH UPDATE: " . $e->getMessage());
            return response()->json(['message' => 'Erro ao processar atualização em lote: ' . $e->getMessage()], 500);
        }
    }
}