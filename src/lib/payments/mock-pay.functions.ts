import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";

function assertMockMode() {
  if ((process.env["PAYMENTS_MODE"] ?? "mock") === "live") {
    throw new Error("Mock payment pages are disabled while PAYMENTS_MODE=live.");
  }
}

/** Stand-in "hosted checkout page" used before real PayTech credentials
 * exist — exercises the exact same confirmPayment() path a real webhook
 * would use, so the async pending→paid flow is fully testable. */
type MockPaymentRow = {
  payment_id: string;
  amount: number;
  provider: string;
  status: string;
  full_name: string | null;
  registration_id: string | null;
};

export const getMockPayment = createServerFn({ method: "GET" })
  .validator(z.object({ paymentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    assertMockMode();
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: payment, error } = await supabase
      .rpc("get_mock_payment_details", { p_payment_id: data.paymentId })
      .maybeSingle<MockPaymentRow>();
    if (error) throw error;
    if (!payment) throw notFound();
    return {
      id: payment.payment_id,
      amount: payment.amount,
      provider: payment.provider,
      status: payment.status,
      fullName: payment.full_name ?? "",
      registrationId: payment.registration_id ?? "",
    };
  });

export const resolveMockPayment = createServerFn({ method: "POST" })
  .validator(z.object({ paymentId: z.string().uuid(), status: z.enum(["success", "failed"]) }))
  .handler(async ({ data }) => {
    assertMockMode();
    const { confirmPayment } = await import("@/lib/payments/confirm-payment.server");
    await confirmPayment({ paymentId: data.paymentId, status: data.status });
  });
