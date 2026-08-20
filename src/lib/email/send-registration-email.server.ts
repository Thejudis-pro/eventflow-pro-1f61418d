/**
 * Sends the registration confirmation email for a participant, if one
 * hasn't already gone out. Called from two places: the PayTech webhook
 * (after a real payment success) and, for free registrations that skip
 * payment entirely, right after register_participant confirms them
 * (src/lib/email/send-registration-email.functions.ts).
 *
 * Reads participant/event data through get_registration_email_info, a
 * SECURITY DEFINER RPC gated by the same internal secret as
 * confirm_payment_secure (see supabase/migrations/20260816000000) --
 * that's what lets this run without the Supabase service-role key, which
 * Lovable's managed setup doesn't expose.
 */
export async function sendRegistrationConfirmationEmail(params: {
  participantId: string;
  origin: string;
}): Promise<void> {
  const secret = process.env["INTERNAL_PAYMENT_SECRET"];
  if (!secret) {
    throw new Error("INTERNAL_PAYMENT_SECRET is not configured.");
  }

  const { supabase } = await import("@/integrations/supabase/client");
  const { data: info, error } = await supabase
    .rpc("get_registration_email_info", { p_participant_id: params.participantId, p_secret: secret })
    .maybeSingle();
  if (error) throw error;
  if (!info) return; // participant not found -- nothing to send

  if (info.sent_email) return; // already sent, idempotent no-op
  if (!["paid", "confirmed", "checked_in"].includes(info.status)) return; // not confirmed yet

  const { buildRegistrationEmail } = await import("./registration-email.template");
  const firstName = info.full_name.split(" ")[0] ?? info.full_name;
  const { subject, html, text } = buildRegistrationEmail({
    firstName,
    fullName: info.full_name,
    registrationId: info.registration_id,
    profileLabel: info.profile_label ?? "Participant",
    zoneLabel: info.zone_label,
    eventName: info.event_name ?? "FESA 2026",
    eventLocation: info.event_location ?? "Dakar, CICES",
    eventStartDate: info.event_start_date,
    eventEndDate: info.event_end_date,
    badgeUrl: `${params.origin}/confirmation/${info.registration_id}`,
  });

  const { sendEmail } = await import("./resend.server");
  await sendEmail({ to: info.email, subject, html, text });

  await supabase.rpc("mark_registration_email_sent", { p_participant_id: params.participantId });
}
