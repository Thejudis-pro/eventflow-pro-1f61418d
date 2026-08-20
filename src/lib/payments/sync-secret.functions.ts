import { createServerFn } from "@tanstack/react-start";

/**
 * Maintenance sync: copies process.env.INTERNAL_PAYMENT_SECRET into the
 * public._internal_config row (key = 'confirm_payment_secret') so the
 * confirm_payment_secure / get_registration_email_info SECURITY DEFINER RPCs
 * -- which compare the caller-supplied secret against that DB value -- stay
 * consistent with the env secret used for PayTech HMAC verification.
 *
 * Uses the service-role admin client (bypasses RLS) to write the row, since
 * _internal_config is a privileged config table. Harmless to re-run; the
 * value written is never returned.
 */
export const syncInternalPaymentSecret = createServerFn({ method: "POST" })
  .handler(async () => {
    const secret = process.env["INTERNAL_PAYMENT_SECRET"];
    if (!secret) {
      return { ok: false, reason: "INTERNAL_PAYMENT_SECRET env var is not set" } as const;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("_internal_config")
      .upsert({ key: "confirm_payment_secret", value: secret }, { onConflict: "key" });

    if (error) {
      return { ok: false, reason: error.message } as const;
    }
    return { ok: true } as const;
  });
