import { createServerFn } from "@tanstack/react-start";

/**
 * Copies process.env.INTERNAL_PAYMENT_SECRET into public._internal_config
 * (key = 'confirm_payment_secret') so confirm_payment_secure and
 * get_registration_email_info(_by_registration_id) stay in sync with
 * whatever the deployment's env currently has -- the exact drift that left
 * paid registrations stuck on "pending" until a customer complained.
 * Previously only reachable via a raw curl to /api/sync-payment-secret,
 * which meant pasting a secret into a terminal -- this lets an approved
 * staff member click a button in the dashboard instead. Takes no input and
 * only ever copies the server's own current secret, so there's nothing for
 * a caller to abuse by calling it.
 */
export const syncPaymentSecret = createServerFn({ method: "POST" }).handler(async () => {
  const secret = process.env["INTERNAL_PAYMENT_SECRET"];
  if (!secret) {
    throw new Error("INTERNAL_PAYMENT_SECRET n'est pas configuré sur le serveur.");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("_internal_config")
    .upsert({ key: "confirm_payment_secret", value: secret }, { onConflict: "key" });
  if (error) throw new Error(error.message);
});
