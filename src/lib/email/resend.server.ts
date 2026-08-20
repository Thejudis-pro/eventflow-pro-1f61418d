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
const RESEND_BATCH_URL = "https://api.resend.com/emails/batch";
const RESEND_DOMAINS_URL = "https://api.resend.com/domains";

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

/** Up to 100 independent, individually-personalized emails in one HTTP call
 * (Resend's own limit). Throws on a non-2xx response for the whole batch --
 * callers should keep batches small enough that one bad address doesn't
 * risk the rest (Resend still queues the valid ones internally in practice,
 * but this adapter treats the call as all-or-nothing for simplicity). */
export async function sendBatchEmails(
  emails: { to: string; subject: string; html: string; text: string }[],
): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["RESEND_FROM_EMAIL"];
  if (!apiKey || !from) {
    throw new Error("Resend is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL).");
  }
  if (emails.length === 0) return;
  if (emails.length > 100) {
    throw new Error("sendBatchEmails: Resend allows at most 100 emails per batch call.");
  }

  const res = await fetch(RESEND_BATCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emails.map((e) => ({ from, ...e }))),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend: batch send failed (HTTP ${res.status}) ${body}`);
  }
}

/** Checks whether RESEND_FROM_EMAIL's domain is actually verified in Resend
 * -- an unverified domain is the single most common reason sends silently
 * fail. Returns null if RESEND_API_KEY/RESEND_FROM_EMAIL aren't set, or if
 * the domain can't be parsed. */
export async function checkFromDomainStatus(): Promise<{ domain: string; status: string } | null> {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["RESEND_FROM_EMAIL"];
  if (!apiKey || !from) return null;

  const emailMatch = /<?([^<\s]+@([^<>\s]+))>?$/.exec(from.trim());
  const domain = emailMatch?.[2]?.toLowerCase();
  if (!domain) return null;

  const res = await fetch(RESEND_DOMAINS_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return { domain, status: `lookup failed (HTTP ${res.status})` };

  const body = (await res.json().catch(() => null)) as { data?: { name: string; status: string }[] } | null;
  const match = body?.data?.find((d) => d.name.toLowerCase() === domain);
  return { domain, status: match?.status ?? "not found in Resend account" };
}
