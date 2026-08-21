import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const inputSchema = z.object({ registrationId: z.string().trim().min(1) });

/**
 * Public "Envoyer le badge par email" button on the confirmation page.
 * Anyone who knows a registration_id can already see/download that badge
 * from this same page (it's the page's whole trust model, same as the
 * WhatsApp share button) -- resending the confirmation email to the
 * address already on file adds no new exposure. Always forces a resend
 * (the visitor clicked an explicit "send it again" button), unlike the
 * automatic triggers which respect the sent_email idempotency flag.
 */
export const sendBadgeEmail = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data }) => {
    const { sendRegistrationConfirmationEmailByRegistrationId } = await import(
      "./send-registration-email.server"
    );
    const origin = new URL(getRequest().url).origin;
    await sendRegistrationConfirmationEmailByRegistrationId({
      registrationId: data.registrationId,
      origin,
      force: true,
    });
  });
