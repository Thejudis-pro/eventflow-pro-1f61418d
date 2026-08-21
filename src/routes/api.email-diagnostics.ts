import { createFileRoute } from "@tanstack/react-router";

/**
 * Read-only config check (GET) plus a real test send (POST) for the Resend
 * integration, same gating as api.payments-diagnostics.ts. GET only proves
 * secrets/domain *look* right; POST actually calls Resend so a real failure
 * (bad key, unverified domain, gateway auth issue) surfaces with Resend's
 * own error message instead of being inferred from config alone.
 */
export const Route = createFileRoute("/api/email-diagnostics")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorizedAdminRequest } = await import("@/lib/admin-auth.server");
        if (!isAuthorizedAdminRequest(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const url = new URL(request.url);
        const to = url.searchParams.get("to");
        if (!to) {
          return Response.json({ ok: false, reason: "Missing ?to=<email address>" }, { status: 400 });
        }

        try {
          const { sendEmail } = await import("@/lib/email/resend.server");
          await sendEmail({
            to,
            subject: "FESA 2026 — Test d'envoi",
            html: "<p>Ceci est un email de test du système d'envoi FESA 2026. Si vous le recevez, la configuration Resend fonctionne.</p>",
            text: "Ceci est un email de test du système d'envoi FESA 2026. Si vous le recevez, la configuration Resend fonctionne.",
          });
          return Response.json({ ok: true, sentTo: to });
        } catch (error) {
          return Response.json(
            { ok: false, reason: error instanceof Error ? error.message : String(error) },
            { status: 500 },
          );
        }
      },
      GET: async ({ request }) => {
        const { isAuthorizedAdminRequest } = await import("@/lib/admin-auth.server");
        if (!isAuthorizedAdminRequest(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const resendApiKeyConfigured = Boolean(process.env["RESEND_API_KEY"]);
        const resendFromEmailConfigured = Boolean(process.env["RESEND_FROM_EMAIL"]);
        const resendFromEmailRaw = JSON.stringify(process.env["RESEND_FROM_EMAIL"] ?? null);

        const { checkFromDomainStatus } = await import("@/lib/email/resend.server");
        const domainStatus = await checkFromDomainStatus().catch((e) => ({
          domain: "unknown",
          status: `check failed: ${e instanceof Error ? e.message : String(e)}`,
        }));

        const note = !resendApiKeyConfigured
          ? "RESEND_API_KEY is not set -- no email will ever send."
          : !resendFromEmailConfigured
            ? "RESEND_FROM_EMAIL is not set -- no email will ever send."
            : domainStatus?.status !== "verified"
              ? `Domain "${domainStatus?.domain}" is not verified in Resend (status: "${domainStatus?.status}"). Add the DNS records Resend gives you for this domain, wait for verification, then retry.`
              : "Config looks correct. If emails still don't arrive, check spam folders and the Resend dashboard's activity log for the actual delivery status.";

        return Response.json({
          resendApiKeyConfigured,
          resendFromEmailConfigured,
          resendFromEmailRaw,
          domainStatus,
          note,
        });
      },
    },
  },
});
