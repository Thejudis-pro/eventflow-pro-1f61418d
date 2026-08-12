/**
 * PayDunya checkout-invoice adapter, built against PayDunya's publicly
 * documented "Checkout Invoice" API. PROVISIONAL: written without access to
 * the user's actual PayDunya account/docs — re-verify field names, the IPN
 * verification scheme, and the sandbox/live base URL before flipping
 * PAYMENTS_MODE=live.
 *
 * Only ever imported dynamically inside a server function/route handler, so
 * the PAYDUNYA_* keys never reach the client bundle.
 */

const PAYDUNYA_BASE_URL = "https://app.paydunya.com/api/v1/checkout-invoice/create";

export type CreatePaydunyaSessionInput = {
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  ipnUrl: string;
  customData?: Record<string, unknown>;
};

export type PaydunyaSessionResult = { checkoutUrl: string; providerSessionId: string };

export async function createPaydunyaSession(
  input: CreatePaydunyaSessionInput,
): Promise<PaydunyaSessionResult> {
  const masterKey = process.env["PAYDUNYA_MASTER_KEY"];
  const privateKey = process.env["PAYDUNYA_PRIVATE_KEY"];
  const publicKey = process.env["PAYDUNYA_PUBLIC_KEY"];
  const token = process.env["PAYDUNYA_TOKEN"];
  if (!masterKey || !privateKey || !publicKey || !token) {
    throw new Error(
      "PayDunya credentials are not configured (PAYDUNYA_MASTER_KEY / PAYDUNYA_PRIVATE_KEY / PAYDUNYA_PUBLIC_KEY / PAYDUNYA_TOKEN).",
    );
  }

  const res = await fetch(PAYDUNYA_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "PAYDUNYA-MASTER-KEY": masterKey,
      "PAYDUNYA-PRIVATE-KEY": privateKey,
      "PAYDUNYA-PUBLIC-KEY": publicKey,
      "PAYDUNYA-TOKEN": token,
    },
    body: JSON.stringify({
      invoice: {
        total_amount: Math.round(input.amount),
        description: input.description,
      },
      store: { name: "FESA 2026 — PAAF" },
      actions: {
        cancel_url: input.cancelUrl,
        return_url: input.returnUrl,
        callback_url: input.ipnUrl,
      },
      custom_data: input.customData ?? {},
    }),
  });

  const body = (await res.json().catch(() => null)) as
    | { response_code?: string; response_text?: string; token?: string }
    | null;
  if (!res.ok || body?.response_code !== "00" || !body.token) {
    throw new Error(body?.response_text ?? `PayDunya: unable to create a checkout session (HTTP ${res.status})`);
  }
  return { checkoutUrl: `https://paydunya.com/checkout/invoice/${body.token}`, providerSessionId: body.token };
}

/**
 * PayDunya's documented pattern is to treat the IPN body as a trigger only,
 * then re-fetch the invoice's real status from their API — safer than
 * trusting the webhook payload's own status field.
 */
export async function confirmPaydunyaInvoice(token: string): Promise<"completed" | "pending" | "cancelled"> {
  const masterKey = process.env["PAYDUNYA_MASTER_KEY"];
  const privateKey = process.env["PAYDUNYA_PRIVATE_KEY"];
  const publicKey = process.env["PAYDUNYA_PUBLIC_KEY"];
  const apiToken = process.env["PAYDUNYA_TOKEN"];
  if (!masterKey || !privateKey || !publicKey || !apiToken) {
    throw new Error("PayDunya credentials are not configured.");
  }

  const res = await fetch(`https://app.paydunya.com/api/v1/checkout-invoice/confirm/${token}`, {
    headers: {
      "PAYDUNYA-MASTER-KEY": masterKey,
      "PAYDUNYA-PRIVATE-KEY": privateKey,
      "PAYDUNYA-PUBLIC-KEY": publicKey,
      "PAYDUNYA-TOKEN": apiToken,
    },
  });
  const body = (await res.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status ?? "pending";
  if (status === "completed" || status === "cancelled") return status;
  return "pending";
}
