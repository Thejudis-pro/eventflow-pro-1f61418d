import { createFileRoute } from "@tanstack/react-router";
import type { Json } from "@/integrations/supabase/types";

/**
 * PayDunya IPN receiver. Treats the webhook body only as a trigger to
 * re-fetch the invoice's real status from PayDunya's API (their documented
 * pattern) rather than trusting the posted body directly. PROVISIONAL —
 * re-verify field names against the real account before go-live.
 */
export const Route = createFileRoute("/api/webhooks/paydunya")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { confirmPaydunyaInvoice } = await import("@/lib/payments/paydunya.server");
        const { confirmPayment } = await import("@/lib/payments/confirm-payment.server");

        const contentType = request.headers.get("content-type") ?? "";
        const payload: Record<string, unknown> = contentType.includes("application/json")
          ? await request.json()
          : Object.fromEntries((await request.formData()).entries());

        const rawData = payload["data"];
        let token: string | undefined;
        if (typeof rawData === "string") {
          try {
            const parsed = JSON.parse(rawData) as { invoice?: { token?: string } };
            token = parsed.invoice?.token;
          } catch {
            token = undefined;
          }
        }
        token ??= typeof payload["token"] === "string" ? (payload["token"] as string) : undefined;

        if (!token) {
          return new Response("missing invoice token", { status: 400 });
        }

        try {
          const invoiceStatus = await confirmPaydunyaInvoice(token);
          if (invoiceStatus === "pending") {
            return new Response("pending", { status: 202 });
          }
          await confirmPayment({
            providerSessionId: token,
            status: invoiceStatus === "completed" ? "success" : "failed",
            webhookPayload: payload as unknown as Json,
          });
        } catch (error) {
          console.error("[webhooks/paydunya]", error);
          return new Response("processing error", { status: 500 });
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
