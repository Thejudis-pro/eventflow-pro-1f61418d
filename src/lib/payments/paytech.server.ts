/**
 * PayTech (paytech.sn) checkout-session adapter — field names, response
 * shape, and IPN verification confirmed against docs.intech.sn/doc_paytech
 * (PayTech's real API reference, redirected from doc.paytech.sn).
 *
 * Only ever imported dynamically inside a server function/route handler
 * (never at module top level of a route or *.functions.ts file), so
 * PAYTECH_API_KEY/PAYTECH_API_SECRET never reach the client bundle.
 */

const PAYTECH_BASE_URL = "https://paytech.sn/api/payment/request-payment";

/**
 * PayTech's API only recognizes the literal string "live" for production --
 * anything else (including reasonable-looking values like "prod" or
 * "production") silently falls through to sandbox mode with no error
 * anywhere, which is exactly how this bit us once already. Normalize the
 * common synonyms instead of trusting the secret's exact spelling.
 */
function resolvePaytechEnv(): "live" | "test" {
  const raw = (process.env["PAYTECH_ENV"] ?? "").trim().toLowerCase();
  return raw === "live" || raw === "prod" || raw === "production" ? "live" : "test";
}

export type CreatePaytechSessionInput = {
  amount: number;
  currency?: string;
  refCommand: string;
  itemName: string;
  successUrl: string;
  cancelUrl: string;
  ipnUrl: string;
  customField?: Record<string, unknown>;
};

export type PaytechSessionResult = { checkoutUrl: string; providerSessionId: string };

export async function createPaytechSession(
  input: CreatePaytechSessionInput,
): Promise<PaytechSessionResult> {
  const apiKey = process.env["PAYTECH_API_KEY"];
  const apiSecret = process.env["PAYTECH_API_SECRET"];
  const env = resolvePaytechEnv();
  if (!apiKey || !apiSecret) {
    throw new Error("PayTech credentials are not configured (PAYTECH_API_KEY / PAYTECH_API_SECRET).");
  }

  const res = await fetch(PAYTECH_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      API_KEY: apiKey,
      API_SECRET: apiSecret,
    },
    body: new URLSearchParams({
      item_name: input.itemName,
      item_price: String(Math.round(input.amount)),
      currency: input.currency ?? "XOF",
      ref_command: input.refCommand,
      command_name: input.itemName,
      env,
      ipn_url: input.ipnUrl,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      custom_field: JSON.stringify(input.customField ?? {}),
    }),
  });

  const body = (await res.json().catch(() => null)) as
    | { success?: number; redirect_url?: string; token?: string; message?: string }
    | null;
  if (!res.ok || !body?.success || !body.redirect_url) {
    throw new Error(body?.message ?? `PayTech: unable to create a checkout session (HTTP ${res.status})`);
  }
  return { checkoutUrl: body.redirect_url, providerSessionId: body.token ?? input.refCommand };
}

/**
 * PayTech IPNs can be verified two ways (per their docs):
 *  1. hmac_compute = HMAC-SHA256("{final_item_price}|{ref_command}|{api_key}", api_secret)
 *     — PayTech's own "recommended" method, since it's bound to the specific
 *     transaction (amount + reference), not just proof of knowing our keys.
 *  2. api_key_sha256 / api_secret_sha256 — SHA-256 hex digests of our own
 *     API key/secret, compared directly. Simpler but not transaction-bound.
 * We prefer #1 when hmac_compute is present, falling back to #2 otherwise —
 * never require both, so a field PayTech omits on some event types can't
 * silently break real payment confirmations.
 */
async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPaytechIpn(payload: Record<string, unknown>): Promise<boolean> {
  const apiKey = process.env["PAYTECH_API_KEY"];
  const apiSecret = process.env["PAYTECH_API_SECRET"];
  if (!apiKey || !apiSecret) return false;

  const sentHmac = String(payload["hmac_compute"] ?? "").toLowerCase();
  if (sentHmac) {
    const finalItemPrice = String(payload["final_item_price"] ?? payload["item_price"] ?? "");
    const refCommand = String(payload["ref_command"] ?? "");
    if (!finalItemPrice || !refCommand) return false;
    const expectedHmac = await hmacSha256Hex(`${finalItemPrice}|${refCommand}|${apiKey}`, apiSecret);
    return safeEqual(sentHmac, expectedHmac);
  }

  const sentKey = String(payload["api_key_sha256"] ?? "").toLowerCase();
  const sentSecret = String(payload["api_secret_sha256"] ?? "").toLowerCase();
  if (!sentKey || !sentSecret) return false;

  const [expectedKey, expectedSecret] = await Promise.all([sha256Hex(apiKey), sha256Hex(apiSecret)]);
  return safeEqual(sentKey, expectedKey) && safeEqual(sentSecret, expectedSecret);
}
