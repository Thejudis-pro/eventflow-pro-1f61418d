-- Server-only lookup for the registration confirmation email. Unlike
-- get_registration (used by the public confirmation page and keyed by the
-- guessable registration_id), this one returns the participant's email
-- address, so it must not be reachable by anyone who just knows/guesses a
-- registration_id or participant_id. Gated by the same internal secret
-- already used by confirm_payment_secure (see 20260816000000) -- only this
-- app's own server code knows it.
CREATE OR REPLACE FUNCTION public.get_registration_email_info(p_participant_id uuid, p_secret text)
RETURNS TABLE (
  full_name text, email text, company text, country text, city text,
  profile_label text, zone_label text,
  registration_id text, status text, sent_email boolean,
  event_name text, event_location text, event_start_date date, event_end_date date
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_expected text;
BEGIN
  SELECT value INTO v_expected FROM public._internal_config WHERE key = 'confirm_payment_secret';
  IF v_expected IS NULL OR p_secret IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT p.full_name, p.email, p.company, p.country, p.city,
         pt.label, pt.zone_label,
         p.registration_id, p.status, coalesce(b.sent_email, false),
         e.name, e.location, e.start_date, e.end_date
  FROM public.participants p
  LEFT JOIN public.profile_types pt ON pt.id = p.profile_type_id
  LEFT JOIN public.events e ON e.id = p.event_id
  LEFT JOIN public.badges b ON b.participant_id = p.id
  WHERE p.id = p_participant_id
  LIMIT 1;
END;
$$;
REVOKE ALL ON FUNCTION public.get_registration_email_info(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_registration_email_info(uuid, text) TO anon, authenticated;

-- Marks the confirmation email as sent -- same low-stakes shape as
-- mark_badge_printed (20260819000000): worst case of anon abuse is a wrong
-- counter, not a real consequence, so no secret needed. Doubles as the
-- idempotency flag the send path checks before calling Resend again.
CREATE OR REPLACE FUNCTION public.mark_registration_email_sent(p_participant_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.badges
  SET sent_email = true
  WHERE participant_id = p_participant_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_registration_email_sent(uuid) TO anon, authenticated;
