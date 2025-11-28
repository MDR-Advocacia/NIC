<!DOCTYPE html>
<html>
<head>
    <title>Minuta de Acordo - Processo {{ $case->case_number }}</title>
    <style>
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 12pt; line-height: 1.5; }
        h1 { text-align: center; font-size: 16pt; text-transform: uppercase; margin-bottom: 30px; }
        .content { margin: 20px 0; text-align: justify; }
        .signature-block { margin-top: 80px; display: flex; justify-content: space-between; }
        .signature { width: 45%; text-align: center; border-top: 1px solid #000; padding-top: 10px; float: left; }
        .clearfix { clear: both; }
    </style>
</head>
<body>
    <h1>Minuta de Acordo Extrajudicial</h1>

    <div class="content">
        <p>
            Pelo presente instrumento particular de transação, de um lado, <strong>{{ $case->client->name }}</strong> (doravante denominado "BANCO"), 
            e de outro lado <strong>{{ $case->opposing_party }}</strong> (doravante denominado "AUTOR"), 
            nos autos do processo nº <strong>{{ $case->case_number }}</strong>, resolvem celebrar o presente ACORDO, 
            mediante as cláusulas e condições abaixo:
        </p>

        <p>
            <strong>CLÁUSULA PRIMEIRA:</strong> O BANCO pagará ao AUTOR a importância líquida, certa e total de 
            <strong>R$ {{ number_format($case->agreement_value, 2, ',', '.') }}</strong>, para a quitação plena, rasa e geral 
            do objeto da presente ação e do contrato discutido.
        </p>

        <p>
            <strong>CLÁUSULA SEGUNDA:</strong> O pagamento será efetuado em até 15 (quinze) dias úteis após a homologação deste acordo, 
            mediante depósito judicial ou crédito em conta bancária a ser informada nos autos.
        </p>

        <p>
            <strong>CLÁUSULA TERCEIRA:</strong> Com o cumprimento da obrigação, as partes dão-se plena quitação, 
            para nada mais reclamarem, seja a que título for, renunciando ao direito de recorrer.
        </p>

        <p>
            <strong>CLÁUSULA QUARTA:</strong> As partes requerem a homologação do presente acordo para que surta seus efeitos legais, 
            com a consequente extinção do processo com resolução do mérito.
        </p>

        <p style="margin-top: 40px; text-align: center;">
            {{ $case->comarca ?? 'São Paulo' }} - {{ $case->state ?? 'SP' }}, {{ date('d/m/Y') }}.
        </p>
    </div>

    <div class="signature-block">
        <div class="signature">
            ___________________________________<br>
            <strong>{{ $case->client->name }}</strong><br>
            (Por seu advogado)
        </div>
        <div class="signature">
            ___________________________________<br>
            <strong>{{ $case->opposing_party }}</strong><br>
            (Ou seu advogado)
        </div>
    </div>
    <div class="clearfix"></div>
</body>
</html>