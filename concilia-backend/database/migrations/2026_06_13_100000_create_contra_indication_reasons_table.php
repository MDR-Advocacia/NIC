<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contra_indication_reasons', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('category')->index();
            $table->timestamps();
        });

        Schema::table('legal_cases', function (Blueprint $table) {
            $table->foreignId('contra_indication_reason_id')
                ->nullable()
                ->after('contra_indication_reason')
                ->constrained('contra_indication_reasons')
                ->nullOnDelete();
        });

        $now = now();
        $reasons = [
            ['category' => 'Em razão da matéria', 'name' => 'MCMV'],
            ['category' => 'Em razão da matéria', 'name' => 'PASEP'],
            ['category' => 'Em razão da matéria', 'name' => 'FIES'],
            ['category' => 'Em razão da matéria', 'name' => 'Planos econômicos'],
            ['category' => 'Em razão da matéria', 'name' => 'Superendividamento'],
            ['category' => 'Em razão da matéria', 'name' => 'Serasa Limpa Nome'],

            ['category' => 'Em razão da obrigação', 'name' => 'Revisão contratual'],
            ['category' => 'Em razão da obrigação', 'name' => 'Limitação de desconto a 30% (margem consignável)'],
            ['category' => 'Em razão da obrigação', 'name' => 'Cédula de crédito rural'],
            ['category' => 'Em razão da obrigação', 'name' => 'Restabelecimento de limite de crédito'],
            ['category' => 'Em razão da obrigação', 'name' => 'SCR'],

            ['category' => 'Em razão da situação processual', 'name' => 'Sentença de extinção'],
            ['category' => 'Em razão da situação processual', 'name' => 'Sentença improcedente'],
            ['category' => 'Em razão da situação processual', 'name' => 'Sentença sem condenação ao banco'],
            ['category' => 'Em razão da situação processual', 'name' => 'Valor da sentença acima do permitido para acordo'],
            ['category' => 'Em razão da situação processual', 'name' => 'Alçada abaixo do valor da condenação'],
            ['category' => 'Em razão da situação processual', 'name' => 'Advogado agressor'],

            ['category' => 'Em razão de defesa robusta', 'name' => 'Contrato assinado eletronicamente'],
            ['category' => 'Em razão de defesa robusta', 'name' => 'Contrato assinado a punho'],
            ['category' => 'Em razão de defesa robusta', 'name' => 'Selfie comprovando a contratação'],
            ['category' => 'Em razão de defesa robusta', 'name' => 'Extratos com compras/movimentações legítimas da parte'],
            ['category' => 'Em razão de defesa robusta', 'name' => 'Valores depositados na conta e movimentações'],
            ['category' => 'Em razão de defesa robusta', 'name' => 'Golpe por engenharia social sem configuração de falha na prestação de serviços'],
        ];

        foreach ($reasons as $reason) {
            DB::table('contra_indication_reasons')->insertOrIgnore([
                'name' => $reason['name'],
                'category' => $reason['category'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('legal_cases', function (Blueprint $table) {
            $table->dropForeign(['contra_indication_reason_id']);
            $table->dropColumn('contra_indication_reason_id');
        });

        Schema::dropIfExists('contra_indication_reasons');
    }
};
