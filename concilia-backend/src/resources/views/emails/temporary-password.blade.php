<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Senha temporaria</title>
</head>
<body style="margin:0; padding:0; background:#0f172a; font-family:Segoe UI, Arial, sans-serif; color:#e2e8f0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a; padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px; background:#1e293b; border:1px solid #334155; border-radius:16px; overflow:hidden; box-shadow:0 24px 56px rgba(0,0,0,.28);">
                    <tr>
                        <td style="padding:32px 32px 18px; text-align:center;">
                            <div style="display:inline-block; padding:12px 18px; border-radius:999px; background:rgba(59,130,246,.14); color:#bfdbfe; font-weight:700; font-size:13px; letter-spacing:.04em;">
                                NIC
                            </div>
                            <h1 style="margin:20px 0 8px; color:#ffffff; font-size:26px; line-height:1.25;">Senha temporaria</h1>
                            <p style="margin:0; color:#94a3b8; font-size:15px;">Nucleo Integrado de Conciliacoes</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:8px 32px 0;">
                            <p style="margin:0 0 16px; color:#e2e8f0; font-size:16px;">Ola, {{ $userName }}.</p>
                            <p style="margin:0 0 18px; color:#cbd5e1; font-size:15px; line-height:1.65;">
                                Sua senha foi redefinida por um administrador. Use a senha temporaria abaixo para entrar no sistema.
                            </p>
                            <div style="margin:0 0 18px; padding:16px; border-radius:12px; background:#0f172a; border:1px solid #334155; text-align:center;">
                                <div style="color:#94a3b8; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; margin-bottom:8px;">Senha temporaria</div>
                                <div style="color:#ffffff; font-size:24px; font-weight:800; letter-spacing:.08em; word-break:break-all;">{{ $temporaryPassword }}</div>
                            </div>
                            <p style="margin:0 0 24px; color:#94a3b8; font-size:14px; line-height:1.6;">
                                No proximo acesso, o sistema solicitara a criacao de uma nova senha pessoal.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:22px 32px 30px; border-top:1px solid #334155;">
                            <p style="margin:0; color:#64748b; font-size:12px; line-height:1.55;">
                                Se voce nao reconhece esta solicitacao, entre em contato com um administrador do NIC.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
