<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCaseRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Permite que qualquer usuário autenticado possa criar um caso.
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Dados do Processo
            'case_number' => ['required', 'string', 'max:255', 'unique:legal_cases,case_number'],
            'action_object' => ['required', 'string', 'max:255'],
            'start_date' => ['required', 'date'],
            'internal_number' => ['nullable', 'string', 'max:255'],

            // Partes
            'opposing_party' => ['required', 'string', 'max:255'],
            'defendant' => ['required', 'string', 'max:255'],
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'lawyer_id' => ['nullable', 'integer', 'exists:users,id'], // Removido 'required' conforme solicitado (sem *)
            'opposing_lawyer' => ['nullable', 'string', 'max:255'],
            'opposing_contact' => ['nullable', 'string', 'max:255'],

            // Localização
            'comarca' => ['required', 'string', 'max:255'], // Agora Required*
            'state' => ['required', 'string', 'size:2'],    // Agora Required*
            'city' => ['required', 'string', 'max:255'],    // Agora Required*
            'special_court' => ['required', 'string', Rule::in(['Sim', 'Não'])],

            // Financeiro
            'cause_value' => ['required', 'numeric', 'min:0'],      // Agora Required*
            'original_value' => ['required', 'numeric', 'min:0'],   // Alçada Required*
            'agreement_value' => ['nullable', 'numeric', 'min:0'],  // Proposta Inicial
            'updated_condemnation_value' => ['nullable', 'numeric', 'min:0'],
            'pcond_probability' => ['nullable', 'numeric', 'min:0', 'max:100'],

            // Outros
            'status' => ['required', 'string'],
            'priority' => ['required', 'string', Rule::in(['alta', 'media', 'baixa'])],
            'description' => ['nullable', 'string'],

            // Checklist JSON e Probabilidade
            'agreement_checklist_data' => ['nullable', 'array'],
            'agreement_probability' => ['nullable', 'integer', 'min:0', 'max:100'],
        ];
    }
}
