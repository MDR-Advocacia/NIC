<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Minuta com Obrigação de Fazer</title>
    <style>
        body { font-family: sans-serif; font-size: 11pt; line-height: 1.5; text-align: justify; }
        p { margin-bottom: 15px; }
        .signature-box { margin-top: 60px; width: 100%; }
        .signature { float: left; width: 45%; border-top: 1px solid #000; padding-top: 5px; text-align: center; font-size: 10pt; }
        .signature.right { float: right; }
        .header-info { font-weight: bold; margin-bottom: 20px; }
        .obligation-list { margin-left: 20px; font-style: italic; border-left: 3px solid #ccc; padding-left: 10px; }
    </style>
</head>
<body>
    <div class="header-info">
        EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ...ª VARA CÍVEL DA COMARCA DE {{ mb_strtoupper($case->comarca ?? '.......................') }}
        <br><br>
        Processo nº: {{ $case->case_number }}<br>
        Autor: {{ mb_strtoupper($case->opposing_party) }}<br>
        Réu: {{ mb_strtoupper($case->client->name) }}
    </div>

    <p>
        <strong>{{ mb_strtoupper($case->opposing_party) }}</strong> e <strong>{{ mb_strtoupper($case->client->name) }}</strong>, vêm informar que compuseram a lide, conforme os artigos 840 e 849 do Código Civil:
    </p>

    <p>
        2. O Réu pagará ao Autor a importância de <strong>R$ {{ number_format($case->agreement_value, 2, ',', '.') }}</strong>, que abrange principal, juros, correção monetária e multa, mediante crédito em conta ou depósito judicial em até 20 dias.
    </p>

    <p>
        3. O acordo abrange as obrigações decorrentes dos fatos discutidos, resultando, quanto ao mérito, na(s) seguinte(s) providência(s) (Obrigação de Fazer):
    </p>

    <div class="obligation-list">
        @if(!empty($case->description))
            <p>{{ $case->description }}</p>
        @else
            <p>.......................................................................................................</p>
            <p>.......................................................................................................</p>
        @endif
    </div>

    <p>
        4. O Autor se compromete a guardar confidencialidade a respeito da transação.
    </p>

    <p>
        5. As custas finais ficam sob a integral responsabilidade do Autor (salvo se beneficiário da Justiça Gratuita).
    </p>

    <p>
        7. As partes outorgam ampla, geral, recíproca e irrevogável quitação para nada mais discutir em relação aos fatos narrados na inicial.
    </p>

    <p>
        8. Requerem a homologação do acordo e a extinção da demanda (art. 487, III, “b”, do CPC).
    </p>

    <p style="text-align: center; margin-top: 30px;">
        {{ $case->comarca ?? 'Local' }}, {{ date('d/m/Y') }}.
    </p>

    <div class="signature-box">
        <div class="signature">
            <strong>{{ $case->opposing_party }}</strong><br>
            Autor(a)
        </div>
        <div class="signature right">
            <strong>{{ $case->client->name }}</strong><br>
            Réu
        </div>
    </div>
</body>
</html>