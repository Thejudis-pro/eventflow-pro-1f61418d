-- Tracks when a badge PDF actually gets generated, so "badges imprimés" on
-- the dashboard is a real count instead of a guess. Called from every place
-- a badge PDF is produced: the public confirmation page (the participant
-- downloading their own badge), the admin participant detail sheet, and the
-- bulk-print action.
--
-- Keyed by registration_id (text), not participant_id -- the public
-- confirmation page only ever has the registration_id (from the URL), never
-- the participant's uuid, and every other call site has registration_id
-- available too (it's a column on participants), so this is the one
-- identifier all three call sites share.
--
-- Deliberately anon-callable, same trust model as prepare_payment_session:
-- this only sets a timestamp, no financial or access-control consequence,
-- and the confirmation page (where most downloads happen) has no staff
-- session to gate behind.
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
GRANT EXECUTE ON FUNCTION public.mark_badge_printed(text) TO anon, authenticated;
