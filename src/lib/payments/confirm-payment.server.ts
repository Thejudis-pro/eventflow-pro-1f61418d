import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

export type ConfirmPaymentResult = { participantId: string; status: "success" | "failed" };

/**
 * The single place allowed to mark a payment — and, on success, the
 * participant — as paid. Shared by the real PayTech/PayDunya webhook
 * handlers and the dev mock-pay page so both exercise identical logic.
 * Never trust a client-supplied "it worked" signal; this only runs from
 * server routes/functions using the service-role client.
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

  const baseQuery = supabaseAdmin.from("payments").select("id, participant_id, status");
  const { data: payment, error: findError } = await (
    paymentId ? baseQuery.eq("id", paymentId) : baseQuery.eq("provider_session_id", providerSessionId!)
  ).maybeSingle();
  if (findError) throw findError;
  if (!payment) throw new Error("payment not found");

  // Idempotent: webhooks can legitimately fire more than once for the same event.
  if (payment.status !== "pending") {
    return { participantId: payment.participant_id, status: payment.status === "success" ? "success" : "failed" };
  }

  const { error: updateError } = await supabaseAdmin
    .from("payments")
    .update({ status, webhook_payload: webhookPayload ?? null })
    .eq("id", payment.id);
  if (updateError) throw updateError;

  if (status === "success") {
    const { error: participantError } = await supabaseAdmin
      .from("participants")
      .update({ status: "paid" })
      .eq("id", payment.participant_id);
    if (participantError) throw participantError;
  }

  return { participantId: payment.participant_id, status };
}
