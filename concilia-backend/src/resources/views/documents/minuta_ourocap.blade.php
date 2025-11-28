<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Acordo Ourocap</title>
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
    <p><strong>AO JUÍZO DO JUIZADO ESPECIAL DA COMARCA DE {{ mb_strtoupper($case->comarca ?? '.......................') }}</strong></p>

    <p><strong>Processo nº {{ $case->case_number }}</strong></p>

    <p>
        Acordo que entre si fazem nesta e melhor forma de direito, de um lado, o <strong>BANCO DO BRASIL S.A.</strong>, e de outro lado <strong>{{ mb_strtoupper($case->opposing_party) }}</strong> (doravante ADVOGADO/AUTOR).
    </p>

    <p>
        2. Considerando a vontade comum das PARTES em encerrar definitivamente a lide, resolvem que o BANCO DO BRASIL S.A. dará em pagamento <strong>01 título(s) de capitalização</strong>, que totaliza(m) o valor de R$ 500,00, no prazo de 20 dias úteis a contar do protocolo desta petição.
    </p>

    <p>
        3. O(s) título(s) de capitalização oferecido(s) em pagamento consiste(m) em: <strong>Ourocap PU 48 meses no valor de R$ 500,00</strong>.
    </p>

    <p>
        4. O(s) título(s) será(ão) restituído(s) ao beneficiário segundo cláusulas e regras constantes nas Condições Gerais do próprio título. O ADVOGADO/AUTOR declara que foi informado das características, carências e riscos do produto.
    </p>

    <p>
        5. O(s) título(s) de capitalização será(ão) disponibilizado(s) no prazo de até 15 dias úteis, na seção Autoatendimento nos sites ou agências do BANCO.
    </p>

    <p>
        6. O BANCO DO BRASIL S.A pagará também ao AUTOR a importância de <strong>R$ {{ number_format($case->agreement_value, 2, ',', '.') }}</strong>, que abrange principal, juros, correção monetária e multa.
    </p>

    <p>
        O crédito será realizado em conta corrente indicada, no prazo de até 15 (quinze) dias úteis, a contar do protocolo desta petição.
    </p>

    <p>
        7. As partes declaram que não há obrigação de fazer pendente.
    </p>

    <p>
        8. Com o cumprimento das obrigações, o AUTOR dá quitação de caráter amplo, geral, integral e irrevogável, renunciando a todos os direitos fundados na ação.
    </p>

    <p>
        11. Por se acharem de pleno e comum acordo, as PARTES assinam este TERMO DE ACORDO e requerem a sua homologação judicial para extinguir a presente AÇÃO, nos termos do art. 487, III, “b”, do CPC.
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
            Réu (Banco do Brasil S.A.)
        </div>
    </div>
</body>
</html>