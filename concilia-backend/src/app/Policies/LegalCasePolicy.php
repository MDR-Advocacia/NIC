<?php

namespace App\Policies;

use App\Models\LegalCase;
use App\Models\User;
use Illuminate\Auth\Access\Response;

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
        
        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, LegalCase $legalCase): bool
    {
        // AJUSTE TEMPORÁRIO: Permitir que qualquer usuário logado atualize qualquer caso.
        return true;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, LegalCase $legalCase): bool
    {
        // AJUSTE TEMPORÁRIO: Permitir que qualquer usuário logado delete qualquer caso.
        return true;
    }
}