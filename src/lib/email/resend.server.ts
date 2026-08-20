/**
 * Thin Resend (resend.com) adapter — same shape as paytech.server.ts. Only
 * ever imported dynamically inside a server function/route handler, so
 * RESEND_API_KEY never reaches the client bundle.
 *
 * RESEND_FROM_EMAIL must be an address on a domain verified in the Resend
 * dashboard (e.g. "FESA 2026 <contact@fesaforum.com>") — sending will fail
 * with an unverified domain. Set both as Lovable secrets, same panel as
 * PAYTECH_API_KEY.
 */

const RESEND_URL = "https://api.resend.com/emails";

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["RESEND_FROM_EMAIL"];
  if (!apiKey || !from) {
    throw new Error("Resend is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL).");
  }

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend: unable to send email (HTTP ${res.status}) ${body}`);
  }
}
