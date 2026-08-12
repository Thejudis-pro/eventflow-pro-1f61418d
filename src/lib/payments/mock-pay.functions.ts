import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";

function assertMockMode() {
  if ((process.env["PAYMENTS_MODE"] ?? "mock") === "live") {
    throw new Error("Mock payment pages are disabled while PAYMENTS_MODE=live.");
  }
}

/** Stand-in "hosted checkout page" used before real PayTech/PayDunya
 * credentials exist — exercises the exact same confirmPayment() path a real
 * webhook would use, so the async pending→paid flow is fully testable. */
export const getMockPayment = createServerFn({ method: "GET" })
  .validator(z.object({ paymentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    assertMockMode();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .select("id, amount, provider, status, participants(registration_id, full_name)")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (error) throw error;
    if (!payment) throw notFound();
    const participant = payment.participants as { registration_id: string | null; full_name: string } | null;
    return {
      id: payment.id,
      amount: payment.amount,
      provider: payment.provider,
      status: payment.status,
      fullName: participant?.full_name ?? "",
      registrationId: participant?.registration_id ?? "",
    };
  });

export const resolveMockPayment = createServerFn({ method: "POST" })
  .validator(z.object({ paymentId: z.string().uuid(), status: z.enum(["success", "failed"]) }))
  .handler(async ({ data }) => {
    assertMockMode();
    const { confirmPayment } = await import("@/lib/payments/confirm-payment.server");
    await confirmPayment({ paymentId: data.paymentId, status: data.status });
  });
