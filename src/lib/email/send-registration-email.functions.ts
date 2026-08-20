import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const inputSchema = z.object({ participantId: z.string().uuid() });

/**
 * Client-triggerable send, used only by the free-registration path (no
 * payment step, so there's no webhook to hang this off of -- see
 * continueFromIdentity in src/routes/inscription.tsx). Paid registrations
 * send from the PayTech webhook instead (api.webhooks.paytech.ts), which is
 * more reliable since it doesn't depend on the browser staying open.
 */
export const sendRegistrationEmail = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data }) => {
    const { sendRegistrationConfirmationEmail } = await import("./send-registration-email.server");
    const origin = new URL(getRequest().url).origin;
    await sendRegistrationConfirmationEmail({ participantId: data.participantId, origin });
  });
