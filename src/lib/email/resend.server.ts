/**
 * Thin Resend (resend.com) adapter, calling their API directly. Only ever
 * imported dynamically inside a server function/route handler, so
 * RESEND_API_KEY never reaches the client bundle.
 *
 * Was briefly routed through Lovable's connector-gateway proxy
 * (https://connector-gateway.lovable.dev/resend), which needs a
 * LOVABLE_API_KEY alongside the Resend key -- but that key is only ever
 * injected automatically inside Lovable's own preview/editor environment,
 * never in the published Cloudflare Worker, so production sends always
 * failed with "Resend is not configured (LOVABLE_API_KEY / RESEND_API_KEY)"
 * no matter how the connector was set up. Calling Resend directly with a
 * real API key from resend.com/api-keys needs no Lovable-specific secret
 * and works identically in preview and production.
 *
 * RESEND_API_KEY: a real API key from resend.com/api-keys (not a Lovable
 * connector key). RESEND_FROM_EMAIL must be an address on a domain verified
 * in the Resend dashboard (e.g. "FESA 2026 <contact@fesaforum.com>"). Set
 * both as plain Lovable secrets, same panel as PAYTECH_API_KEY.
 */

const RESEND_URL = "https://api.resend.com";

function authHeaders(): Record<string, string> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    throw new Error("Resend is not configured (RESEND_API_KEY).");
  }
  return {
    Authorization: `Bearer ${apiKey}`,
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
  const res = await fetch(`${RESEND_URL}/emails`, {
    method: "POST",
    headers: authHeaders(),
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

  const res = await fetch(`${RESEND_URL}/emails/batch`, {
    method: "POST",
    headers: authHeaders(),
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
  if (!from || !process.env["RESEND_API_KEY"]) return null;

  const emailMatch = /<?([^<\s]+@([^<>\s]+))>?$/.exec(from.trim());
  const domain = emailMatch?.[2]?.toLowerCase();
  if (!domain) return null;

  const res = await fetch(`${RESEND_URL}/domains`, { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401 && body.includes("restricted_api_key")) {
      return { domain, status: "unknown (send-only key, domain list not readable)" };
    }
    return { domain, status: `lookup failed (HTTP ${res.status}) ${body}` };
  }

  const body = (await res.json().catch(() => null)) as { data?: { name: string; status: string }[] } | null;
  const match = body?.data?.find((d) => d.name.toLowerCase() === domain);
  return { domain, status: match?.status ?? "not found in Resend account" };
}
