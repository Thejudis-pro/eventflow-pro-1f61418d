import { createFileRoute } from "@tanstack/react-router";

/**
 * Read-only, side-effect-free config check for the payment secrets --
 * built after "worked on laptop, not on mobile, now test mode everywhere"
 * confusion. There's no device-specific logic anywhere in the payment
 * flow (verified by reading the code), so device differences were always
 * actually timing differences against config changes. This exists so that
 * can be confirmed directly instead of guessed at from symptoms, on any
 * device, without needing Lovable dashboard access.
 *
 * Never returns actual secret values -- only booleans/derived state. The
 * internalPaymentSecretMatchesDatabase check calls confirm_payment_secure
 * with a provider_session_id that can never match a real payment
 * ("__diagnostic_probe__"), so it always resolves to either "unauthorized"
 * (secret mismatch) or "payment not found" (secret matched) with zero
 * chance of touching real data.
 */
export const Route = createFileRoute("/api/payments-diagnostics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { isAuthorizedAdminRequest } = await import("@/lib/admin-auth.server");
        if (!isAuthorizedAdminRequest(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { resolvePaytechEnv } = await import("@/lib/payments/paytech.server");

        const paytechApiKeyConfigured = Boolean(process.env["PAYTECH_API_KEY"]);
        const paytechApiSecretConfigured = Boolean(process.env["PAYTECH_API_SECRET"]);
        const paytechEnvResolvesTo = resolvePaytechEnv();
        // PAYTECH_ENV is a mode flag, not a credential -- safe to echo back
        // raw (JSON.stringify so stray quotes/whitespace/newlines are visible
        // instead of silently swallowed by the response).
        const paytechEnvRaw = JSON.stringify(process.env["PAYTECH_ENV"] ?? null);

        const internalSecret = process.env["INTERNAL_PAYMENT_SECRET"];
        let internalPaymentSecretMatchesDatabase: boolean | null = null;
        if (internalSecret) {
          const { supabase } = await import("@/integrations/supabase/client");
          const { error } = await supabase.rpc("confirm_payment_secure", {
            p_payment_id: null as unknown as string,
            p_provider_session_id: "__diagnostic_probe__",
            p_status: "failed",
            p_webhook_payload: null,
            p_secret: internalSecret,
          });
          internalPaymentSecretMatchesDatabase = !(error && /unauthorized/i.test(error.message));
        }

        return Response.json({
          paytechEnvResolvesTo,
          paytechEnvRaw,
          paytechApiKeyConfigured,
          paytechApiSecretConfigured,
          internalPaymentSecretConfigured: Boolean(internalSecret),
          internalPaymentSecretMatchesDatabase,
          note:
            paytechEnvResolvesTo !== "prod"
              ? "PAYTECH_ENV is not resolving to prod -- checkout will be sandbox/test for everyone, on every device."
              : !paytechApiKeyConfigured || !paytechApiSecretConfigured
                ? "PAYTECH_API_KEY/PAYTECH_API_SECRET missing -- checkout will fail outright."
                : internalPaymentSecretMatchesDatabase === false
                  ? "INTERNAL_PAYMENT_SECRET does not match the database -- payments will go through PayTech but never get marked paid."
                  : "Config looks consistent. If checkout still errors, PAYTECH_API_KEY/SECRET are likely PayTech's sandbox key pair, or PayTech support hasn't activated this account for production yet.",
        });
      },
    },
  },
});
