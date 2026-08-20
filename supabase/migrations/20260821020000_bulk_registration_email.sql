-- 20260821000000 cleared confirm_payment_secret's value to '' (the value
-- column is NOT NULL, so '' was the only way to "unset" it in place) --
-- but confirm_payment_secure/get_registration_email_info's existing check
-- is only `v_expected IS NULL OR p_secret IS DISTINCT FROM v_expected`,
-- which '' does NOT satisfy if a caller also passed an empty p_secret.
-- Deleting the row instead makes the lookup genuinely return NULL, which
-- that existing check already handles correctly. Guarded so this is a
-- no-op if the secret has already been re-synced since then.
DELETE FROM public._internal_config WHERE key = 'confirm_payment_secret' AND value = '';

-- Bulk version of get_registration_email_info for the one-time "resend the
-- confirmation email to everyone already confirmed" campaign -- fetches
-- every eligible participant for an event in one call instead of one RPC
-- round-trip per person. Same secret-gating as the single-participant
-- version (it also returns email addresses in bulk, so it can't be left
-- open like get_registration).
CREATE OR REPLACE FUNCTION public.get_bulk_registration_email_info(p_event_id uuid, p_secret text)
RETURNS TABLE (
  participant_id uuid, full_name text, email text,
  profile_label text, zone_label text, registration_id text, status text,
  event_name text, event_location text, event_start_date date, event_end_date date
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_expected text;
BEGIN
  SELECT value INTO v_expected FROM public._internal_config WHERE key = 'confirm_payment_secret';
  IF v_expected IS NULL OR v_expected = '' OR p_secret IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.email, pt.label, pt.zone_label, p.registration_id, p.status,
         e.name, e.location, e.start_date, e.end_date
  FROM public.participants p
  LEFT JOIN public.profile_types pt ON pt.id = p.profile_type_id
  LEFT JOIN public.events e ON e.id = p.event_id
  WHERE p.event_id = p_event_id AND p.status IN ('paid', 'confirmed', 'checked_in');
END;
$$;
REVOKE ALL ON FUNCTION public.get_bulk_registration_email_info(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bulk_registration_email_info(uuid, text) TO anon, authenticated;

-- Bulk version of mark_registration_email_sent -- same low-stakes shape
-- (a wrong bookkeeping flag, not a real consequence), so no secret needed.
CREATE OR REPLACE FUNCTION public.mark_registration_emails_sent(p_participant_ids uuid[])
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.badges SET sent_email = true WHERE participant_id = ANY(p_participant_ids);
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_registration_emails_sent(uuid[]) TO anon, authenticated;
