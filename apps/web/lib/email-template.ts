/**
 * HTML template for welcome/reset password emails (inline CSS, compatible with most clients).
 * Placeholders: {{LOGO_URL}}, {{PORTAL_URL}}, {{USER_EMAIL}}, {{DEFAULT_PASSWORD}}, {{IS_RESET_TEXT}}
 */
export function getWelcomeResetEmailHtml(params: {
  logoUrl: string;
  /** Quando definido, o logo é referenciado por CID (imagem em anexo inline). */
  logoCid?: string | null;
  portalUrl: string;
  userEmail: string;
  defaultPassword: string;
  isResetText: string;
  /** Quando definido, substitui o parágrafo por baixo do título (ex.: variante "primeira loja"). */
  introParagraph?: string;
}): string {
  const { logoUrl, logoCid, portalUrl, userEmail, defaultPassword, isResetText, introParagraph } = params;
  const logoSrc = logoCid ? "cid:logoBwb" : logoUrl;
  const paragraphHtml = introParagraph ?? "O seu acesso ao <strong style=\"color:#ffffff;\">Portal Admin</strong> está pronto.";
  return `<!doctype html>
<html lang="pt">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BWB Menu Online</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0b1220;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0b1220;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:600px;background-color:#0f172a;border:1px solid #334155;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;background:linear-gradient(135deg,#0f172a,#111827);border-bottom:1px solid #334155;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="left" style="vertical-align:middle;">
                      <img src="${logoSrc}" width="140" alt="BWB" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:140px;" />
                    </td>
                    <td align="right" style="vertical-align:middle;color:#cbd5e1;font-family:Arial,sans-serif;font-size:12px;">
                      BWB Menu Online
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:24px;color:#e2e8f0;font-family:Arial,sans-serif;">
                <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.3;color:#ffffff;">
                  ${isResetText}
                </h1>

                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#cbd5e1;">
                  ${paragraphHtml}
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;background-color:#0b1220;border:1px solid #334155;border-radius:12px;">
                  <tr>
                    <td style="padding:14px 16px;color:#e2e8f0;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;">
                      <div><strong style="color:#ffffff;">Email:</strong> ${userEmail}</div>
                      <div style="margin-top:6px;"><strong style="color:#ffffff;">Password (por defeito):</strong> ${defaultPassword}</div>
                      <div style="margin-top:10px;color:#94a3b8;font-size:12px;">
                        Por segurança, na primeira entrada será solicitado que altere a palavra-passe.
                      </div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;">
                  <tr>
                    <td align="center" bgcolor="#10b981" style="border-radius:10px;">
                      <a href="${portalUrl}"
                         style="display:inline-block;padding:12px 18px;font-family:Arial,sans-serif;font-size:14px;color:#ffffff;text-decoration:none;font-weight:bold;">
                        Aceder ao Portal Admin
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 6px 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  Se o botão não funcionar, copie e cole este link no seu browser:
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#a7f3d0;word-break:break-all;">
                  ${portalUrl}
                </p>

                <hr style="border:none;border-top:1px solid #334155;margin:20px 0;" />

                <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  Se não solicitou este acesso, ignore este email ou contacte o suporte.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 24px;background-color:#0b1220;border-top:1px solid #334155;color:#64748b;font-family:Arial,sans-serif;font-size:11px;line-height:1.5;">
                © BWB • Mensagem automática • Não responda a este email
              </td>
            </tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:600px;">
            <tr>
              <td style="padding:10px 8px;text-align:center;color:#475569;font-family:Arial,sans-serif;font-size:11px;">
                Suporte: suporte@bwb.pt
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
</html>`;
}
