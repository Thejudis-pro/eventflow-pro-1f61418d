import { createFileRoute } from "@tanstack/react-router";

type BackupParticipant = {
  registration_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  sector: string | null;
  function: string | null;
  country: string | null;
  city: string | null;
  badge_quantity: number;
  status: string;
  profile_label: string | null;
  offer_name: string | null;
  created_at: string;
};

type BackupPayment = {
  registration_id: string | null;
  provider: string;
  amount: number;
  status: string;
  provider_transaction_id: string | null;
  created_at: string;
};

function toCsv<T extends Record<string, unknown>>(rows: T[], columns: (keyof T)[]): string {
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [columns.join(",")];
  for (const row of rows) lines.push(columns.map((c) => escape(row[c])).join(","));
  return lines.join("\n");
}

/**
 * Daily backup of "key info" only -- full participant + payment detail, but
 * never the raw provider/webhook payloads (those can carry provider tokens
 * and aren't needed to reconstruct who registered/paid for what). Meant to
 * be called once a day by an external cron (GitHub Actions -- see
 * .github/workflows/daily-backup.yml), since this app has no scheduler of
 * its own. Stores a snapshot in event_backups AND emails it as CSV, per
 * request. Reuses the admin/INTERNAL_PAYMENT_SECRET gate already used by
 * the other maintenance routes.
 */
export const Route = createFileRoute("/api/backups/run-daily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorizedAdminRequest } = await import("@/lib/admin-auth.server");
        if (!isAuthorizedAdminRequest(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const secret = process.env["INTERNAL_PAYMENT_SECRET"];
        if (!secret) {
          return new Response("INTERNAL_PAYMENT_SECRET is not configured.", { status: 500 });
        }

        const { supabase } = await import("@/integrations/supabase/client");
        const { CURRENT_EVENT_SLUG } = await import("@/lib/event");

        const { data: event, error: eventError } = await supabase
          .from("events")
          .select("id")
          .eq("slug", CURRENT_EVENT_SLUG)
          .single();
        if (eventError || !event) {
          return new Response(`Event not found: ${eventError?.message ?? "no row"}`, {
            status: 500,
          });
        }

        const { data, error } = await supabase
          .rpc("run_daily_backup_secure", { p_event_id: event.id, p_secret: secret })
          .maybeSingle<{
            id: string;
            payload: { participants: BackupParticipant[]; payments: BackupPayment[] };
            participants_count: number;
            payments_count: number;
          }>();
        if (error) {
          console.error("[backups/run-daily]", error);
          return new Response(`Backup failed: ${error.message}`, { status: 500 });
        }
        if (!data) {
          return new Response("Backup RPC returned no row.", { status: 500 });
        }

        const { participants, payments } = data.payload;
        const participantsCsv = toCsv(participants, [
          "registration_id",
          "full_name",
          "email",
          "phone",
          "company",
          "sector",
          "function",
          "country",
          "city",
          "badge_quantity",
          "status",
          "profile_label",
          "offer_name",
          "created_at",
        ]);
        const paymentsCsv = toCsv(payments, [
          "registration_id",
          "provider",
          "amount",
          "status",
          "provider_transaction_id",
          "created_at",
        ]);

        const today = new Date().toISOString().slice(0, 10);
        try {
          const { sendEmail } = await import("@/lib/email/resend.server");
          await sendEmail({
            to: "contact@fesaforum.com",
            subject: `[FESA 2026] Sauvegarde quotidienne — ${today}`,
            text: `Sauvegarde du ${today} : ${data.participants_count} participant(s), ${data.payments_count} paiement(s). Voir les fichiers CSV joints.`,
            html: `<p>Sauvegarde du ${today} : ${data.participants_count} participant(s), ${data.payments_count} paiement(s). Voir les fichiers CSV joints.</p>`,
            attachments: [
              { filename: `participants-${today}.csv`, content: participantsCsv },
              { filename: `paiements-${today}.csv`, content: paymentsCsv },
            ],
          });
        } catch (emailError) {
          // The snapshot is already safely stored in event_backups even if
          // the email fails -- don't report the whole backup as failed.
          console.error("[backups/run-daily] email failed", emailError);
          return Response.json({
            backupId: data.id,
            participants: data.participants_count,
            payments: data.payments_count,
            emailSent: false,
          });
        }

        return Response.json({
          backupId: data.id,
          participants: data.participants_count,
          payments: data.payments_count,
          emailSent: true,
        });
      },
    },
  },
});
