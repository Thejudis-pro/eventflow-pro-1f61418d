import type { Json } from "@/integrations/supabase/types";

export type ConfirmPaymentResult = { participantId: string; status: "success" | "failed" };

type ConfirmRow = { participant_id: string; status: string };

/**
 * The single place allowed to mark a payment -- and, on success, the
 * participant -- as paid. Shared by the real PayTech webhook handler and
 * the dev mock-pay page so both exercise identical logic.
 * Never trust a client-supplied "it worked" signal; this only runs from
 * server routes/functions, and the underlying confirm_payment_secure RPC
 * additionally requires INTERNAL_PAYMENT_SECRET (a server-only secret --
 * see supabase/migrations/20260816000000_payments_without_service_role.sql
 * for why this doesn't use the Supabase service-role key).
 */
export async function confirmPayment(params: {
  paymentId?: string;
  providerSessionId?: string;
  status: "success" | "failed";
  webhookPayload?: Json;
}): Promise<ConfirmPaymentResult> {
  const { paymentId, providerSessionId, status, webhookPayload } = params;
  if (!paymentId && !providerSessionId) {
    throw new Error("confirmPayment requires paymentId or providerSessionId");
  }

  const secret = process.env["INTERNAL_PAYMENT_SECRET"];
  if (!secret) {
    throw new Error("INTERNAL_PAYMENT_SECRET is not configured.");
  }

  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase
    .rpc("confirm_payment_secure", {
      p_payment_id: paymentId ?? null,
      p_provider_session_id: providerSessionId ?? null,
      p_status: status,
      p_webhook_payload: webhookPayload ?? null,
      p_secret: secret,
    })
    .maybeSingle<ConfirmRow>();
  if (error) throw error;
  if (!data) throw new Error("payment not found");

  return { participantId: data.participant_id, status: data.status as "success" | "failed" };
}
