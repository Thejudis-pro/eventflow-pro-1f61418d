import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BATCH_SIZE = 90; // stay under Resend's 100-per-call limit with margin

const inputSchema = z.object({
  eventId: z.string().uuid(),
  profileTypeId: z.string().uuid().nullable(),
  subject: z.string().trim().min(1),
  message: z.string().trim().min(1),
});

/**
 * The dashboard's "Segmentation pour communication ciblée" broadcast --
 * admin-only free-text email to every participant in a segment (or the
 * whole event when profileTypeId is null). Distinct from
 * send-bulk-registration-emails.server.ts (fixed confirmation content,
 * gated by INTERNAL_PAYMENT_SECRET, called from a maintenance route): this
 * one is user-authored content triggered from the dashboard by a logged-in
 * staffer, so it authenticates via that staffer's own Supabase session
 * (requireSupabaseAuth) instead, and re-checks admin role server-side --
 * never trust the dashboard UI alone to have gated this.
 */
export const sendSegmentEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(inputSchema)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin_staff", {
      _user_id: userId,
    });
    if (adminError) throw adminError;
    if (!isAdmin) throw new Error("unauthorized");

    let query = supabase
      .from("participants")
      .select("full_name, email")
      .eq("event_id", data.eventId);
    if (data.profileTypeId) {
      query = query.eq("profile_type_id", data.profileTypeId);
    }
    const { data: rows, error } = await query;
    if (error) throw error;

    const recipients = rows ?? [];
    if (recipients.length === 0) {
      return { totalRecipients: 0, sent: 0 };
    }

    const { buildSegmentEmail } = await import("./segment-email.template");
    const { sendBatchEmails } = await import("./resend.server");

    let sent = 0;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const emails = batch.map((row) => {
        const firstName = row.full_name.split(" ")[0] ?? row.full_name;
        const { subject, html, text } = buildSegmentEmail({
          firstName,
          subject: data.subject,
          message: data.message,
        });
        return { to: row.email, subject, html, text };
      });
      await sendBatchEmails(emails);
      sent += batch.length;
    }

    return { totalRecipients: recipients.length, sent };
  });
