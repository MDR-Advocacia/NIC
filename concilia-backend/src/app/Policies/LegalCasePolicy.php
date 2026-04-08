<?php

namespace App\Policies;

use App\Models\LegalCase;
use App\Models\User;

class LegalCasePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, LegalCase $legalCase): bool
    {
        if (in_array($user->role, ['administrador', 'admin', 'supervisor', 'operador'], true)) {
            return true;
        }

        if ($user->role === 'indicador') {
            if ($legalCase->status === LegalCase::STATUS_INITIAL_ANALYSIS) {
                return true;
            }

            return (string) ($legalCase->indicator_user_id ?? '') === (string) $user->id;
        }

        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->role !== 'indicador';
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, LegalCase $legalCase): bool
    {
        return $user->role !== 'indicador';
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, LegalCase $legalCase): bool
    {
        // SEGURANÇA: Apenas administradores podem excluir
        return in_array($user->role, ['administrador', 'admin'], true);
    }
}
