<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

class UserPolicy
{
    /**
     * Quem pode ver a lista de usuários?
     * Admin (ou administrador) e Supervisor.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['administrador', 'admin', 'supervisor']);
    }

    /**
     * Quem pode ver um usuário específico?
     * Admin (ou administrador) e Supervisor.
     */
    public function view(User $user, User $model): bool
    {
        return in_array($user->role, ['administrador', 'admin', 'supervisor']);
    }

    /**
     * Quem pode criar usuários?
     * Admin (ou administrador) e Supervisor.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['administrador', 'admin', 'supervisor']);
    }

    /**
     * Quem pode editar usuários?
     * Admin (ou administrador) e Supervisor.
     */
    public function update(User $user, User $model): bool
    {
        return in_array($user->role, ['administrador', 'admin', 'supervisor']);
    }

    /**
     * Quem pode excluir usuários?
     * Apenas Admin/Administrador.
     */
    public function delete(User $user, User $model): bool
    {
        // 1. Apenas Admin pode excluir
        if (!in_array($user->role, ['administrador', 'admin'])) {
            return false;
        }

        // 2. Não pode excluir a si mesmo
        if ($user->id === $model->id) {
            return false;
        }

        return true;
    }
}