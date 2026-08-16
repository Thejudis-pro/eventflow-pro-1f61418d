import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const inputSchema = z.object({
  participantId: z.string().uuid(),
  provider: z.literal("paytech"),
});

type PaymentSession = {
  payment_id: string;
  amount: number;
  item_name: string;
  registration_id: string;
};

/**
 * Creates a payment session for a just-registered participant and returns a
 * checkout URL to redirect the browser to. The amount is always computed
 * server-side (inside prepare_payment_session, a SECURITY DEFINER RPC) from
 * the offer/profile price -- never trusts a client-supplied amount.
 *
 * Uses the public anon-key client rather than the service-role client:
 * Lovable's managed-Supabase setup doesn't expose the service role key, so
 * every privileged write here goes through SECURITY DEFINER RPCs instead
 * (see supabase/migrations/20260816000000_payments_without_service_role.sql).
 *
 * In PAYMENTS_MODE=mock (the default until real credentials are supplied),
 * the "checkout" is a local /dev/mock-pay page that exercises the exact
 * same confirmPayment() path a real webhook would use.
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data }) => {
    const { supabase } = await import("@/integrations/supabase/client");

    const { data: session, error } = await supabase
      .rpc("prepare_payment_session", {
        p_participant_id: data.participantId,
        p_provider: data.provider,
      })
      .maybeSingle<PaymentSession>();
    if (error) throw error;
    if (!session) throw new Error("Registration not found");

    const origin = new URL(getRequest().url).origin;
    const successUrl = `${origin}/confirmation/${session.registration_id}`;
    const mode = process.env["PAYMENTS_MODE"] ?? "mock";

    if (mode !== "live") {
      return { checkoutUrl: `/dev/mock-pay/${session.payment_id}` };
    }

    const ipnUrl = `${origin}/api/webhooks/${data.provider}`;

    const { createPaytechSession } = await import("./paytech.server");
    const paytechSession = await createPaytechSession({
      amount: session.amount,
      refCommand: session.registration_id,
      itemName: session.item_name,
      successUrl,
      cancelUrl: successUrl,
      ipnUrl,
      customField: { paymentId: session.payment_id },
    });

    const { error: finalizeError } = await supabase.rpc("finalize_payment_checkout", {
      p_payment_id: session.payment_id,
      p_checkout_url: paytechSession.checkoutUrl,
      p_provider_session_id: paytechSession.providerSessionId,
    });
    if (finalizeError) throw finalizeError;

    return { checkoutUrl: paytechSession.checkoutUrl };
  });
