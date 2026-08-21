/**
 * Thin Resend adapter, routed through the Lovable connector gateway. Only
 * ever imported dynamically inside a server function/route handler, so the
 * keys never reach the client bundle.
 *
 * RESEND_API_KEY is the connection key for the gateway (set automatically by
 * the linked Resend connector); LOVABLE_API_KEY authenticates the project.
 * RESEND_FROM_EMAIL must be an address on a domain verified in Resend
 * (e.g. "FESA 2026 <contact@fesaforum.com>").
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

function gatewayHeaders(): Record<string, string> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !connectionKey) {
    throw new Error("Resend is not configured (LOVABLE_API_KEY / RESEND_API_KEY).");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connectionKey,
    "Content-Type": "application/json",
  };
}

function fromAddress(): string {
  const from = process.env["RESEND_FROM_EMAIL"];
  if (!from) {
    throw new Error("Resend is not configured (RESEND_FROM_EMAIL).");
  }
  return from;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: gatewayHeaders(),
    body: JSON.stringify({
      from: fromAddress(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[resend] send failed [${res.status}]: ${body}`);
    throw new Error(`Resend: unable to send email (HTTP ${res.status}) ${body}`);
  }
}

/** Up to 100 independent, individually-personalized emails in one call
 * (Resend's own limit). Throws on a non-2xx response for the whole batch. */
export async function sendBatchEmails(
  emails: { to: string; subject: string; html: string; text: string }[],
): Promise<void> {
  if (emails.length === 0) return;
  if (emails.length > 100) {
    throw new Error("sendBatchEmails: Resend allows at most 100 emails per batch call.");
  }
  const from = fromAddress();

  const res = await fetch(`${GATEWAY_URL}/emails/batch`, {
    method: "POST",
    headers: gatewayHeaders(),
    body: JSON.stringify(emails.map((e) => ({ from, ...e, to: [e.to] }))),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[resend] batch send failed [${res.status}]: ${body}`);
    throw new Error(`Resend: batch send failed (HTTP ${res.status}) ${body}`);
  }
}

/** Checks whether RESEND_FROM_EMAIL's domain is actually verified in Resend
 * -- an unverified domain is the most common reason sends silently fail. */
export async function checkFromDomainStatus(): Promise<{ domain: string; status: string } | null> {
  const from = process.env["RESEND_FROM_EMAIL"];
  if (!from || !process.env["RESEND_API_KEY"] || !process.env["LOVABLE_API_KEY"]) return null;

  const emailMatch = /<?([^<\s]+@([^<>\s]+))>?$/.exec(from.trim());
  const domain = emailMatch?.[2]?.toLowerCase();
  if (!domain) return null;

  const res = await fetch(`${GATEWAY_URL}/domains`, { headers: gatewayHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { domain, status: `lookup failed (HTTP ${res.status}) ${body}` };
  }

  const body = (await res.json().catch(() => null)) as { data?: { name: string; status: string }[] } | null;
  const match = body?.data?.find((d) => d.name.toLowerCase() === domain);
  return { domain, status: match?.status ?? "not found in Resend account" };
}
