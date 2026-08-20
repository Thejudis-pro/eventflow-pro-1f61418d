import { REG } from "@/lib/fesa-registration-theme";

export type RegistrationEmailData = {
  firstName: string;
  fullName: string;
  registrationId: string;
  profileLabel: string;
  zoneLabel: string | null;
  eventName: string;
  eventLocation: string;
  eventStartDate: string;
  eventEndDate: string;
  badgeUrl: string;
};

/** "21 & 22 septembre 2026", or "30 septembre & 1 octobre 2026" across months. */
function formatEventDates(startIso: string, endIso: string): string {
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  const day = (d: Date) => d.getUTCDate();
  const month = (d: Date) => new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(d);
  const year = end.getUTCFullYear();

  if (start.getTime() === end.getTime()) return `${day(start)} ${month(start)} ${year}`;
  if (month(start) === month(end)) return `${day(start)} & ${day(end)} ${month(end)} ${year}`;
  return `${day(start)} ${month(start)} & ${day(end)} ${month(end)} ${year}`;
}

export function buildRegistrationEmail(data: RegistrationEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const dates = formatEventDates(data.eventStartDate, data.eventEndDate);
  const subject = `Votre badge ${data.eventName} est prêt — réf. ${data.registrationId}`;

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
                <div style="display:inline-block;background:#e9f3ec;color:#0b7a3c;font-size:12px;font-weight:800;letter-spacing:0.04em;padding:6px 14px;border-radius:999px;">
                  INSCRIPTION CONFIRMÉE
                </div>
                <h1 style="margin:16px 0 0;font-size:26px;line-height:1.2;color:${REG.dark};">
                  Votre badge est prêt, ${data.firstName}.
                </h1>
                <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:${REG.body};">
                  Merci de vous être inscrit(e) au <strong>${data.eventName}</strong>, qui se tiendra
                  les <strong>${dates}</strong> à <strong>${data.eventLocation}</strong>. Votre
                  inscription est confirmée et votre badge nominatif est prêt.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:${REG.creamLight};border-radius:12px;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;color:${REG.mutedLight};">RÉFÉRENCE</div>
                      <div style="font-size:18px;font-weight:800;color:${REG.dark};margin-top:2px;">${data.registrationId}</div>
                      <div style="font-size:13px;color:${REG.muted};margin-top:4px;">${data.profileLabel}${data.zoneLabel ? ` · ${data.zoneLabel}` : ""}</div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;">
                  <tr>
                    <td style="border-radius:12px;background:${REG.orange};">
                      <a href="${data.badgeUrl}" style="display:block;padding:14px 26px;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;">
                        Voir mon badge →
                      </a>
                    </td>
                  </tr>
                </table>

                <div style="margin-top:26px;border-top:1px solid ${REG.line};padding-top:18px;">
                  <div style="font-size:12px;font-weight:800;letter-spacing:0.06em;color:${REG.mutedLight};">BON À SAVOIR</div>
                  <ul style="margin:10px 0 0;padding-left:18px;font-size:14px;line-height:1.7;color:${REG.body};">
                    <li>Présentez le QR code de votre badge à l&rsquo;accueil pour l&rsquo;accréditation.</li>
                    <li>Téléchargez ou imprimez votre badge à tout moment depuis le lien ci-dessus.</li>
                    <li>Une impression sur place reste possible au guichet accréditation.</li>
                  </ul>
                </div>

                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${REG.mutedLight};">
                  Une question ? Contactez-nous au <a href="tel:+221774778360" style="color:${REG.green};">+221 77 477 83 60</a>
                  ou <a href="mailto:contact@fesaforum.com" style="color:${REG.green};">contact@fesaforum.com</a>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:${REG.dark};padding:16px 28px;color:rgba(251,247,240,0.6);font-size:11px;">
                © ${new Date(data.eventEndDate).getUTCFullYear()} PAAF — FESA 2026. Vous recevez cet email suite à votre inscription sur fesaforum.com.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Votre badge est prêt, ${data.firstName}.`,
    ``,
    `Merci de vous être inscrit(e) au ${data.eventName}, qui se tiendra les ${dates} à ${data.eventLocation}.`,
    `Votre inscription est confirmée.`,
    ``,
    `Référence : ${data.registrationId}`,
    `Catégorie : ${data.profileLabel}${data.zoneLabel ? ` (${data.zoneLabel})` : ""}`,
    ``,
    `Voir votre badge : ${data.badgeUrl}`,
    ``,
    `Bon à savoir :`,
    `- Présentez le QR code de votre badge à l'accueil pour l'accréditation.`,
    `- Téléchargez ou imprimez votre badge à tout moment depuis le lien ci-dessus.`,
    `- Une impression sur place reste possible au guichet accréditation.`,
    ``,
    `Une question ? +221 77 477 83 60 — contact@fesaforum.com`,
  ].join("\n");

  return { subject, html, text };
}
