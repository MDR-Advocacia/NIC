<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Redefinicao de senha</title>
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
                            <h1 style="margin:20px 0 8px; color:#ffffff; font-size:26px; line-height:1.25;">Redefinicao de senha</h1>
                            <p style="margin:0; color:#94a3b8; font-size:15px;">Nucleo Integrado de Conciliacoes</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:8px 32px 0;">
                            <p style="margin:0 0 16px; color:#e2e8f0; font-size:16px;">Ola, {{ $userName }}.</p>
                            <p style="margin:0 0 16px; color:#cbd5e1; font-size:15px; line-height:1.65;">
                                Recebemos uma solicitacao para redefinir a senha da sua conta no {{ $appName }}.
                                Clique no botao abaixo para criar uma nova senha.
                            </p>
                            <p style="margin:0 0 24px; color:#94a3b8; font-size:14px; line-height:1.6;">
                                Este link expira em {{ $expiresIn }} minutos. Se voce nao solicitou a redefinicao, ignore este email.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding:0 32px 28px;">
                            <a href="{{ $resetUrl }}" style="display:inline-block; background:#3b82f6; color:#ffffff; text-decoration:none; font-weight:700; padding:14px 24px; border-radius:10px;">
                                Redefinir senha
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:22px 32px 30px; border-top:1px solid #334155;">
                            <p style="margin:0 0 10px; color:#94a3b8; font-size:12px; line-height:1.55;">
                                Se o botao nao funcionar, copie e cole este link no navegador:
                            </p>
                            <p style="margin:0; color:#93c5fd; font-size:12px; line-height:1.55; word-break:break-all;">
                                {{ $resetUrl }}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
