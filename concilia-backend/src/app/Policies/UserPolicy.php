<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

class UserPolicy
{
    /**
     * Quem pode ver a lista de usuários?
     * LIBERADO para Operador (necessário para carregar a Dashboard/Pipeline sem erro 403).
     * O filtro de segurança será feito no Controller.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['administrador', 'supervisor', 'operador', 'indicador']);
    }

    /**
     * Quem pode ver um usuário específico?
     * Admin, Supervisor e o próprio Operador (se for ele mesmo).
     */
    public function view(User $user, User $model): bool
    {
        if (in_array($user->role, ['administrador', 'supervisor'])) {
            return true;
        }
        // Operador e Indicador só veem a si mesmos
        return $user->id === $model->id;
    }

    /**
     * Quem pode criar usuários?
     * Apenas Admin e Supervisor.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['administrador', 'supervisor']);
    }

    /**
     * Quem pode editar usuários?
     * Apenas Admin e Supervisor.
     */
    public function update(User $user, User $model): bool
    {
        return in_array($user->role, ['administrador', 'supervisor']);
    }

    /**
     * Quem pode excluir usuários?
     * Apenas Admin.
     */
    public function delete(User $user, User $model): bool
    {
        // 1. Apenas Admin pode excluir
        if (!in_array($user->role, ['administrador'])) {
            return false;
        }

        // 2. Não pode excluir a si mesmo
        if ($user->id === $model->id) {
            return false;
        }

        return true;
    }

    /**
     * Quem pode resetar a senha de outro usuário?
     * Apenas Admin e nunca na própria conta.
     */
    public function resetPassword(User $user, User $model): bool
    {
        if (!in_array($user->role, ['administrador', 'admin'], true)) {
            return false;
        }

        return $user->id !== $model->id;
    }
}
