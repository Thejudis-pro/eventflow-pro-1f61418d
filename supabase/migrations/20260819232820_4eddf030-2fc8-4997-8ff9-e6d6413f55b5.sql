ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS printed_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_badge_printed(p_registration_id text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.badges b
  SET printed_at = now()
  FROM public.participants p
  WHERE b.participant_id = p.id AND p.registration_id = p_registration_id;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_badge_printed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_badge_printed(text) TO anon, authenticated;