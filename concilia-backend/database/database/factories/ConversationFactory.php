<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Conversation>
 */
class ConversationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'contact_name' => $this->faker->name(),
            'contact_phone' => $this->faker->numerify('+55###########'),
            'legal_case_id' => null, // Por padrão, as conversas são criadas desvinculadas
        ];
    }
}