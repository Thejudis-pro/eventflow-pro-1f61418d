import { createFileRoute } from "@tanstack/react-router";
import type { Json } from "@/integrations/supabase/types";

/**
 * PayTech IPN receiver. Server-side only — this is what's allowed to mark a
 * payment successful, never the browser. See verifyPaytechIpn in
 * paytech.server.ts for the signature check (hmac_compute preferred, falls
 * back to api_key_sha256/api_secret_sha256).
 */
export const Route = createFileRoute("/api/webhooks/paytech")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyPaytechIpn } = await import("@/lib/payments/paytech.server");
        const { confirmPayment } = await import("@/lib/payments/confirm-payment.server");

        const contentType = request.headers.get("content-type") ?? "";
        const payload: Record<string, unknown> = contentType.includes("application/json")
          ? await request.json()
          : Object.fromEntries((await request.formData()).entries());

        if (!(await verifyPaytechIpn(payload))) {
          return new Response("invalid signature", { status: 401 });
        }

        const providerSessionId = String(payload["token"] ?? payload["ref_command"] ?? "");
        if (!providerSessionId) {
          return new Response("missing session reference", { status: 400 });
        }

        const paytechStatus = String(payload["type_event"] ?? payload["status"] ?? "").toLowerCase();
        const status = paytechStatus === "sale_complete" || paytechStatus === "success" ? "success" : "failed";

        let confirmed: Awaited<ReturnType<typeof confirmPayment>>;
        try {
          confirmed = await confirmPayment({ providerSessionId, status, webhookPayload: payload as unknown as Json });
        } catch (error) {
          console.error("[webhooks/paytech]", error);
          return new Response("processing error", { status: 500 });
        }

        if (confirmed.status === "success") {
          // Best-effort and awaited (Workers can kill background promises
          // once the response is sent, so this can't be fire-and-forget) --
          // an email failure shouldn't make PayTech retry a webhook that
          // already succeeded at its actual job of marking the payment paid.
          try {
            const { sendRegistrationConfirmationEmail } = await import("@/lib/email/send-registration-email.server");
            const origin = new URL(request.url).origin;
            await sendRegistrationConfirmationEmail({ participantId: confirmed.participantId, origin });
          } catch (error) {
            console.error("[webhooks/paytech] confirmation email", error);
          }
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
