import { createFileRoute } from "@tanstack/react-router";

/**
 * Read-only config check for the Resend integration, same shape and gating
 * as api.payments-diagnostics.ts. Checks the domain's actual verification
 * status via Resend's own API -- an unverified sending domain is the most
 * common reason emails silently never arrive.
 */
export const Route = createFileRoute("/api/email-diagnostics")({
  server: {
    handlers: {
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
