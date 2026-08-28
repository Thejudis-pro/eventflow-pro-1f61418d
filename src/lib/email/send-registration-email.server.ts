/**
 * Sends the registration confirmation email for a participant, if one
 * hasn't already gone out. Called from several places: the PayTech webhook
 * (after a real payment success), free registrations/comp badges/CSV
 * imports right after they're confirmed (all via
 * src/lib/email/send-registration-email.functions.ts), and the manual
 * "Renvoyer par email" buttons in the admin sheet and the public
 * confirmation page (src/lib/email/send-badge-email.functions.ts).
 *
 * Reads participant/event data through get_registration_email_info(_by_registration_id),
 * SECURITY DEFINER RPCs gated by the same internal secret as
 * confirm_payment_secure (see supabase/migrations/20260816000000) --
 * that's what lets this run without the Supabase service-role key, which
 * Lovable's managed setup doesn't expose.
 */

type EmailInfo = {
  participant_id?: string;
  full_name: string;
  email: string;
  status: string;
  sent_email: boolean;
  registration_id: string;
  profile_label: string | null;
  zone_label: string | null;
  event_name: string | null;
  event_location: string | null;
  event_start_date: string;
  event_end_date: string;
};

async function sendFromInfo(params: {
  info: EmailInfo;
  participantId: string;
  origin: string;
  force?: boolean | undefined;
}): Promise<void> {
  const { info } = params;
  if (info.sent_email && !params.force) return; // already sent, idempotent no-op
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
  try {
    await sendEmail({ to: info.email, subject, html, text });
  } catch (error) {
    // Automatic sends (webhook, free-registration flow) have no user watching
    // for a toast -- without this they fail into a server/browser console log
    // nobody reads, and the participant just never gets their badge. Manual
    // resends (force: true) already surface errors to the admin who clicked
    // the button, so skip the alert there to avoid noise.
    if (!params.force)
      await notifyAdminOfSendFailure({ info, participantId: params.participantId, error });
    throw error;
  }

  const { supabase } = await import("@/integrations/supabase/client");
  await supabase.rpc("mark_registration_email_sent", { p_participant_id: params.participantId });
}

/** Best-effort admin alert for an automatic confirmation-email failure. */
async function notifyAdminOfSendFailure(params: {
  info: EmailInfo;
  participantId: string;
  error: unknown;
}): Promise<void> {
  const { info, participantId, error } = params;
  const { getErrorMessage } = await import("../get-error-message");
  const message = getErrorMessage(error);
  const { notifyAdmin } = await import("../notify-admin.server");
  await notifyAdmin({
    subject: `[FESA 2026] Échec envoi email de confirmation — ${info.full_name}`,
    lines: [
      `L'envoi automatique de l'email de confirmation a échoué pour :`,
      `Participant : ${info.full_name} <${info.email}>`,
      `Registration ID : ${info.registration_id}`,
      `Participant ID : ${participantId}`,
      `Statut : ${info.status}`,
      `Erreur : ${message}`,
      `Renvoyez manuellement depuis la fiche participant du dashboard admin ("Renvoyer par email").`,
    ],
  });
}

export async function sendRegistrationConfirmationEmail(params: {
  participantId: string;
  origin: string;
  /** Staff-initiated resend (e.g. "I never got it" or a failed automatic
   * send) -- bypasses the sent_email idempotency check below, which exists
   * to stop the *automatic* triggers (webhook, wizard) from double-sending. */
  force?: boolean | undefined;
}): Promise<void> {
  const secret = process.env["INTERNAL_PAYMENT_SECRET"];
  if (!secret) {
    throw new Error("INTERNAL_PAYMENT_SECRET is not configured.");
  }

  const { supabase } = await import("@/integrations/supabase/client");
  const { data: info, error } = await supabase
    .rpc("get_registration_email_info", {
      p_participant_id: params.participantId,
      p_secret: secret,
    })
    .maybeSingle();
  if (error) throw error;
  if (!info) return; // participant not found -- nothing to send

  await sendFromInfo({
    info,
    participantId: params.participantId,
    origin: params.origin,
    force: params.force,
  });
}

/**
 * Same send, keyed by registration_id instead of participant_id -- for the
 * public confirmation page's "Envoyer le badge par email" button, which
 * (like every other action on that page) only ever has the registration_id
 * from the URL, never the participant's real uuid.
 */
export async function sendRegistrationConfirmationEmailByRegistrationId(params: {
  registrationId: string;
  origin: string;
  force?: boolean | undefined;
}): Promise<void> {
  const secret = process.env["INTERNAL_PAYMENT_SECRET"];
  if (!secret) {
    throw new Error("INTERNAL_PAYMENT_SECRET is not configured.");
  }

  const { supabase } = await import("@/integrations/supabase/client");
  const { data: info, error } = await supabase
    .rpc("get_registration_email_info_by_registration_id", {
      p_registration_id: params.registrationId,
      p_secret: secret,
    })
    .maybeSingle();
  if (error) throw error;
  if (!info || !info.participant_id) return; // registration not found -- nothing to send

  await sendFromInfo({
    info,
    participantId: info.participant_id,
    origin: params.origin,
    force: params.force,
  });
}
