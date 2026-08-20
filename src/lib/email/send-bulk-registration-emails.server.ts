import { CURRENT_EVENT_SLUG } from "@/lib/event";

const BATCH_SIZE = 90; // stay under Resend's 100-per-call limit with margin

export type BulkSendResult = {
  totalEligible: number;
  sent: number;
  failedBatches: { batchIndex: number; error: string; participantIds: string[] }[];
};

/**
 * One-time "resend the confirmation email to everyone already confirmed"
 * campaign, for participants who registered before automatic sending
 * existed (or who want the info resent regardless of the sent_email flag
 * the per-registration trigger uses for idempotency -- this bulk tool
 * deliberately ignores that flag and resends to everyone eligible).
 */
export async function sendBulkRegistrationEmails(params: { origin: string }): Promise<BulkSendResult> {
  const secret = process.env["INTERNAL_PAYMENT_SECRET"];
  if (!secret) {
    throw new Error("INTERNAL_PAYMENT_SECRET is not configured.");
  }

  const { supabase } = await import("@/integrations/supabase/client");

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("slug", CURRENT_EVENT_SLUG)
    .single();
  if (eventError) throw eventError;

  const { data: rows, error } = await supabase.rpc("get_bulk_registration_email_info", {
    p_event_id: event.id,
    p_secret: secret,
  });
  if (error) throw error;

  const eligible = rows ?? [];
  if (eligible.length === 0) {
    return { totalEligible: 0, sent: 0, failedBatches: [] };
  }

  const { buildRegistrationEmail } = await import("./registration-email.template");
  const { sendBatchEmails } = await import("./resend.server");

  let sent = 0;
  const failedBatches: BulkSendResult["failedBatches"] = [];

  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE);
    const emails = batch.map((row) => {
      const firstName = row.full_name.split(" ")[0] ?? row.full_name;
      const { subject, html, text } = buildRegistrationEmail({
        firstName,
        fullName: row.full_name,
        registrationId: row.registration_id,
        profileLabel: row.profile_label ?? "Participant",
        zoneLabel: row.zone_label,
        eventName: row.event_name ?? "FESA 2026",
        eventLocation: row.event_location ?? "Dakar, CICES",
        eventStartDate: row.event_start_date,
        eventEndDate: row.event_end_date,
        badgeUrl: `${params.origin}/confirmation/${row.registration_id}`,
      });
      return { to: row.email, subject, html, text };
    });

    try {
      await sendBatchEmails(emails);
      sent += batch.length;
      await supabase.rpc("mark_registration_emails_sent", {
        p_participant_ids: batch.map((row) => row.participant_id),
      });
    } catch (batchError) {
      failedBatches.push({
        batchIndex: i / BATCH_SIZE,
        error: batchError instanceof Error ? batchError.message : String(batchError),
        participantIds: batch.map((row) => row.participant_id),
      });
    }
  }

  return { totalEligible: eligible.length, sent, failedBatches };
}
