<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Minuta de Acordo</title>
    <style>
        body { font-family: sans-serif; font-size: 11pt; line-height: 1.5; text-align: justify; }
        p { margin-bottom: 15px; }
        .signature-box { margin-top: 50px; width: 100%; }
        .signature { float: left; width: 45%; border-top: 1px solid #000; padding-top: 5px; text-align: center; font-size: 10pt; }
        .signature.right { float: right; }
        .header { font-weight: bold; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="header">
        EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE {{ mb_strtoupper($case->comarca ?? '.......................') }}
    </div>

    <p><strong>Processo nº {{ $case->case_number }}</strong></p>

    <p>
        <strong>{{ mb_strtoupper($case->opposing_party) }}</strong>, já qualificado(a) nos autos, e <strong>{{ mb_strtoupper($case->client->name) }}</strong>, também qualificado, vêm respeitosamente perante Vossa Excelência informar que celebraram ACORDO, nos seguintes termos:
    </p>

    <p>
        1. O Réu pagará à parte Autora a quantia total de <strong>R$ {{ number_format($case->agreement_value, 2, ',', '.') }}</strong>, a título de indenização integral e definitiva referente aos fatos narrados na inicial.
    </p>

    <p>
        2. O pagamento será efetuado no prazo de até 15 (quinze) dias úteis, contados a partir do protocolo desta petição, mediante depósito na conta bancária de titularidade do patrono da parte Autora ou depósito judicial vinculado aos autos.
    </p>

    <p>
        3. As partes declaram que não restam obrigações de fazer a serem cumpridas.
    </p>

    <p>
        4. O não cumprimento do acordo no prazo estipulado ensejará a incidência de multa de 10% (dez por cento) sobre o valor inadimplido.
    </p>

    <p>
        5. Com o recebimento do valor acordado, a parte Autora outorga ao Réu a mais ampla, geral, rasa e irrevogável quitação quanto ao objeto deste processo e à relação jurídica material subjacente.
    </p>

    <p>
        6. As partes renunciam ao prazo recursal e requerem a imediata homologação deste acordo (art. 487, III, "b", CPC).
    </p>

    <p style="text-align: center; margin-top: 40px;">
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