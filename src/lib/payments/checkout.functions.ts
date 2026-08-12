import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const inputSchema = z.object({
  participantId: z.string().uuid(),
  provider: z.enum(["paytech", "paydunya"]),
});

/**
 * Creates a payment session for a just-registered participant and returns a
 * checkout URL to redirect the browser to. The amount is always computed
 * server-side from the offer/profile price — never trusts a client-supplied
 * amount. In PAYMENTS_MODE=mock (the default until real credentials are
 * supplied), the "checkout" is a local /dev/mock-pay page that exercises the
 * exact same confirmPayment() path a real webhook would use.
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: participant, error } = await supabaseAdmin
      .from("participants")
      .select(
        "id, registration_id, status, offers(price, name), profile_types(price, label, requires_payment)",
      )
      .eq("id", data.participantId)
      .maybeSingle();
    if (error) throw error;
    if (!participant) throw new Error("Registration not found");

    const offer = participant.offers as { price: number; name: string } | null;
    const profileType = participant.profile_types as
      | { price: number | null; label: string; requires_payment: boolean }
      | null;
    const amount = offer?.price ?? profileType?.price;
    if (!amount) throw new Error("This registration has no amount due");

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        participant_id: participant.id,
        provider: data.provider,
        amount,
        status: "pending",
      })
      .select("id")
      .single();
    if (paymentError) throw paymentError;

    const origin = new URL(getRequest().url).origin;
    const successUrl = `${origin}/confirmation/${participant.registration_id}`;
    const mode = process.env["PAYMENTS_MODE"] ?? "mock";

    if (mode !== "live") {
      return { checkoutUrl: `/dev/mock-pay/${payment.id}` };
    }

    const ipnUrl = `${origin}/api/webhooks/${data.provider}`;
    const itemName = `FESA 2026 — ${offer?.name ?? profileType?.label ?? "Inscription"}`;

    if (data.provider === "paytech") {
      const { createPaytechSession } = await import("./paytech.server");
      const session = await createPaytechSession({
        amount,
        refCommand: participant.registration_id ?? payment.id,
        itemName,
        successUrl,
        cancelUrl: successUrl,
        ipnUrl,
        customField: { paymentId: payment.id },
      });
      await supabaseAdmin
        .from("payments")
        .update({ checkout_url: session.checkoutUrl, provider_session_id: session.providerSessionId })
        .eq("id", payment.id);
      return { checkoutUrl: session.checkoutUrl };
    }

    const { createPaydunyaSession } = await import("./paydunya.server");
    const session = await createPaydunyaSession({
      amount,
      description: itemName,
      returnUrl: successUrl,
      cancelUrl: successUrl,
      ipnUrl,
      customData: { paymentId: payment.id },
    });
    await supabaseAdmin
      .from("payments")
      .update({ checkout_url: session.checkoutUrl, provider_session_id: session.providerSessionId })
      .eq("id", payment.id);
    return { checkoutUrl: session.checkoutUrl };
  });
