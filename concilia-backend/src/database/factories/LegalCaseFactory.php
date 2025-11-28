<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Client;
use App\Models\User;

class LegalCaseFactory extends Factory
{
    public function definition(): array
    {
        $causeValue = $this->faker->numberBetween(5000, 150000);
        $agreementValue = $this->faker->optional(0.8)->numberBetween((int)($causeValue * 0.4), (int)($causeValue * 0.9));

        return [
            'case_number' => $this->faker->unique()->numerify('#######-##.####.#.##.####'),
            'client_id' => Client::inRandomOrder()->first()->id,
            
            // CORREÇÃO AQUI: Mudamos de lawyer_id para user_id
            'user_id' => User::inRandomOrder()->first()->id,

            'opposing_party' => $this->faker->name(),
            'defendant' => $this->faker->company(),
            'action_object' => $this->faker->randomElement(["Contrato de Empréstimo - Juros Abusivos", "Cartão de Crédito - Cobrança Indevida", "Financiamento Imobiliário - Revisional", "Conta Corrente - Tarifas Abusivas", "Consignado - Desconto Indevido", "Cheque Especial - Juros Excessivos", "Seguro - Cobrança Indevida", "CDC - Venda Casada"]),
            'description' => $this->faker->sentence(),
            'status' => $this->faker->randomElement(['initial_analysis', 'proposal_sent', 'in_negotiation', 'awaiting_draft', 'closed_deal', 'failed_deal']),
            'priority' => $this->faker->randomElement(['baixa', 'media', 'alta']),
            'original_value' => $causeValue * 1.2,
            'agreement_value' => $agreementValue,
            'cause_value' => $causeValue,
            'comarca' => $this->faker->city(),
            'state' => $this->faker->stateAbbr(),
            'start_date' => $this->faker->dateTimeBetween('-2 year', 'now')->format('Y-m-d'),
        ];
    }
}