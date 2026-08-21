-- The public confirmation page (/confirmation/$registrationId) only ever
-- has the registration_id, never the participant's real uuid (get_registration,
-- its one read RPC, deliberately doesn't expose it) -- so its new "Envoyer
-- le badge par email" button needs a lookup keyed the same way. Same
-- shape/secret-gating as get_registration_email_info (20260820000000):
-- still returns an email address, so it must stay behind the internal
-- secret, not be left open like get_registration.
CREATE OR REPLACE FUNCTION public.get_registration_email_info_by_registration_id(p_registration_id text, p_secret text)
RETURNS TABLE (
  participant_id uuid, full_name text, email text, company text, country text, city text,
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
  SELECT p.id, p.full_name, p.email, p.company, p.country, p.city,
         pt.label, pt.zone_label,
         p.registration_id, p.status, coalesce(b.sent_email, false),
         e.name, e.location, e.start_date, e.end_date
  FROM public.participants p
  LEFT JOIN public.profile_types pt ON pt.id = p.profile_type_id
  LEFT JOIN public.events e ON e.id = p.event_id
  LEFT JOIN public.badges b ON b.participant_id = p.id
  WHERE p.registration_id = p_registration_id
  LIMIT 1;
END;
$$;
REVOKE ALL ON FUNCTION public.get_registration_email_info_by_registration_id(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_registration_email_info_by_registration_id(text, text) TO anon, authenticated;
