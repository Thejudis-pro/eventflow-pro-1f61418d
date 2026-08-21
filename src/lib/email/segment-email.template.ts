import { REG } from "@/lib/fesa-registration-theme";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Free-text admin broadcast to a segment of participants -- unlike
 * registration-email.template.ts this has no fixed structure, just the
 * subject/body the organizer typed, wrapped in the same card shell so it
 * still reads as an official FESA 2026 email. */
export function buildSegmentEmail(data: {
  firstName: string;
  subject: string;
  message: string;
}): { subject: string; html: string; text: string } {
  const paragraphs = data.message
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const htmlBody = paragraphs
    .map(
      (p) =>
        `<p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:${REG.body};">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:${REG.creamLight};font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${REG.creamLight};padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${REG.line};">
            <tr>
              <td style="background:${REG.dark};padding:22px 28px;">
                <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.01em;">FESA 2026</div>
                <div style="color:rgba(251,247,240,0.75);font-size:12px;margin-top:2px;">Forum de l&rsquo;Entrepreneuriat et de la Souveraineté Alimentaire</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;color:${REG.dark};">
                  Bonjour ${escapeHtml(data.firstName)},
                </h1>
                ${htmlBody}
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${REG.mutedLight};">
                  Une question ? Contactez-nous au <a href="tel:+221774778360" style="color:${REG.green};">+221 77 477 83 60</a>
                  ou <a href="mailto:contact@fesaforum.com" style="color:${REG.green};">contact@fesaforum.com</a>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:${REG.dark};padding:16px 28px;color:rgba(251,247,240,0.6);font-size:11px;">
                © ${new Date().getUTCFullYear()} PAAF — FESA 2026. Vous recevez cet email suite à votre inscription sur fesaforum.com.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Bonjour ${data.firstName},`,
    ``,
    ...paragraphs,
    ``,
    `Une question ? +221 77 477 83 60 — contact@fesaforum.com`,
  ].join("\n");

  return { subject: data.subject, html, text };
}
