import { createFileRoute } from "@tanstack/react-router";

/**
 * One-off maintenance action: (re)sends the registration confirmation
 * email to every participant with status paid/confirmed/checked_in for the
 * current event, regardless of whether the automatic per-registration
 * trigger already sent one. Safe to re-run.
 */
export const Route = createFileRoute("/api/send-bulk-confirmation-emails")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorizedAdminRequest } = await import("@/lib/admin-auth.server");
        if (!isAuthorizedAdminRequest(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const { sendBulkRegistrationEmails } = await import(
            "@/lib/email/send-bulk-registration-emails.server"
          );
          const origin = new URL(request.url).origin;
          const result = await sendBulkRegistrationEmails({ origin });
          return Response.json({ ok: true, ...result });
        } catch (error) {
          return Response.json(
            { ok: false, reason: error instanceof Error ? error.message : String(error) },
            { status: 500 },
          );
        }
      },
    },
  },
});
