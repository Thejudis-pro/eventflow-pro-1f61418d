/**
 * PayTech (paytech.sn) checkout-session adapter, built against PayTech's
 * publicly documented "Payment Request" API. PROVISIONAL: written without
 * access to the user's actual PayTech account/docs — re-verify field names,
 * the IPN signature scheme, and the sandbox/live base URL against the real
 * dashboard before flipping PAYMENTS_MODE=live.
 *
 * Only ever imported dynamically inside a server function/route handler
 * (never at module top level of a route or *.functions.ts file), so
 * PAYTECH_API_KEY/PAYTECH_API_SECRET never reach the client bundle.
 */

const PAYTECH_BASE_URL = "https://paytech.sn/api/payment/request-payment";

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
  const env = process.env["PAYTECH_ENV"] ?? "test";
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
 * PROVISIONAL: PayTech IPNs are documented to include an `hmac_compute`
 * field derived from the API key/secret. This checks presence only — swap
 * in the exact documented HMAC recipe once confirmed against the live
 * PayTech dashboard, before relying on this for real traffic.
 */
export function verifyPaytechIpn(payload: Record<string, unknown>): boolean {
  return typeof payload["hmac_compute"] === "string" && payload["hmac_compute"].length > 0;
}
