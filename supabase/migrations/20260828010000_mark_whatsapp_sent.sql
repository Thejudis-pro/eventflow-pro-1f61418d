-- badges.sent_whatsapp has existed since the initial schema but nothing
-- ever set it -- WhatsApp sending was manual with no tracking. Mirrors
-- mark_registration_email_sent (20260820000000): worst case of anon abuse
-- is a wrong counter, not a real consequence, so no secret needed.
CREATE OR REPLACE FUNCTION public.mark_registration_whatsapp_sent(p_participant_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.badges
  SET sent_whatsapp = true
  WHERE participant_id = p_participant_id;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_registration_whatsapp_sent(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_registration_whatsapp_sent(uuid) TO anon, authenticated;
