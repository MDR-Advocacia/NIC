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
            'case_number' => ['required', 'string', 'max:255', 'unique:legal_cases,case_number'],
            'action_object' => ['required', 'string', 'max:255'],
            'opposing_party' => ['required', 'string', 'max:255'],
            'defendant' => ['required', 'string', 'max:255'],
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'lawyer_id' => ['required', 'integer', 'exists:users,id'],
            'comarca' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'size:2'],
            'special_court' => ['required', 'string', Rule::in(['Sim', 'Não'])],
            'opposing_lawyer' => ['nullable', 'string', 'max:255'],
            'opposing_contact' => ['nullable', 'string', 'max:255'],
            'original_value' => ['required', 'numeric', 'min:0'],
            'agreement_value' => ['nullable', 'numeric', 'min:0'],
            'cause_value' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'string', Rule::in(['initial_analysis', 'proposal_sent', 'in_negotiation', 'awaiting_draft', 'closed_deal', 'failed_deal'])],
            'priority' => ['required', 'string', Rule::in(['alta', 'media', 'baixa'])],
            'description' => ['nullable', 'string'],
            'tags' => ['nullable', 'array'],
            'tags.*.text' => ['required_with:tags', 'string'], 
            'tags.*.color' => ['required_with:tags', 'string'], 
        ];
    }
}