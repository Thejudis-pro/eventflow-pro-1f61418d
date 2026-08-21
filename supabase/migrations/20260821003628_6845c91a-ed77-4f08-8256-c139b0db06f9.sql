DELETE FROM public._internal_config WHERE key = 'confirm_payment_secret' AND value = '';

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

CREATE OR REPLACE FUNCTION public.mark_registration_emails_sent(p_participant_ids uuid[])
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.badges SET sent_email = true WHERE participant_id = ANY(p_participant_ids);
END;
$$;
REVOKE ALL ON FUNCTION public.mark_registration_emails_sent(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_registration_emails_sent(uuid[]) TO anon, authenticated;