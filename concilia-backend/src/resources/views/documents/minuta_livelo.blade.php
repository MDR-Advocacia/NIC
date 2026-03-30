<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Acordo Livelo</title>
    <style>
        body { font-family: sans-serif; font-size: 11pt; line-height: 1.5; text-align: justify; }
        h1 { text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 20px; }
        p { margin-bottom: 15px; }
        .signature-box { margin-top: 50px; width: 100%; }
        .signature { float: left; width: 45%; border-top: 1px solid #000; padding-top: 5px; text-align: center; font-size: 10pt; }
        .signature.right { float: right; }
    </style>
</head>
<body>
    @php
        $liveloPoints = $case->livelo_points;
    @endphp

    <p><strong>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA CÍVEL DA COMARCA DE {{ mb_strtoupper($case->comarca ?? '.......................') }}</strong></p>

    <p><strong>Processo nº {{ $case->case_number }}</strong></p>

    <p>
        <strong>{{ mb_strtoupper($case->client->name) }}</strong>, já qualificado nos autos, e <strong>{{ mb_strtoupper($case->opposing_party) }}</strong>, vêm, respeitosamente, informar que as partes se compuseram, nos seguintes termos:
    </p>

    <p>
        1. Para pôr fim à demanda, a Ré <strong>LIVELO S.A.</strong> efetuará o crédito de <strong>{{ $liveloPoints ? number_format((int) $liveloPoints, 0, ',', '.') : '________' }} pontos</strong> na conta Livelo de titularidade da parte Autora.
    </p>

    <p>
        2. O crédito dos pontos será realizado no prazo de até <strong>15 (quinze) dias úteis</strong>, a contar da data de homologação deste acordo.
    </p>

    @if(!is_null($case->agreement_value) && $case->agreement_value !== '')
        <p>
            3. Além da pontuação, a Ré pagará ao Autor a importância de <strong>R$ {{ number_format((float) $case->agreement_value, 2, ',', '.') }}</strong>, referente a danos morais/materiais, mediante depósito judicial ou crédito em conta.
        </p>

        <p>
            4. O pagamento do valor pecuniário será realizado em até 20 (vinte) dias úteis após o protocolo desta minuta.
        </p>
    @endif

    <p>
        5. Com o cumprimento {{ !is_null($case->agreement_value) && $case->agreement_value !== '' ? 'das obrigações (crédito dos pontos e pagamento do valor)' : 'da obrigação de crédito dos pontos' }}, a parte Autora dá plena, geral e irrevogável quitação quanto ao objeto da presente ação.
    </p>

    <p>
        6. Requerem a homologação do presente acordo para que surta seus jurídicos e legais efeitos, com a consequente extinção do feito com resolução de mérito (art. 487, III, 'b', CPC).
    </p>

    <p style="text-align: center; margin-top: 30px;">
        {{ $case->comarca ?? 'Local' }}, {{ date('d') }} de {{ date('M') }} de {{ date('Y') }}.
    </p>

    <div class="signature-box">
        <div class="signature">
            <strong>{{ $case->opposing_party }}</strong><br>
            Autor(a)
        </div>
        <div class="signature right">
            <strong>{{ $case->client->name }}</strong><br>
            Réu (Livelo S.A.)
        </div>
    </div>
</body>
</html>
