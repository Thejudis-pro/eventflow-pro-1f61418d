-- Phase 0 gaps: checkins table, payments.webhook_payload, missing indexes
ALTER TABLE public.payments ADD COLUMN webhook_payload jsonb;

CREATE INDEX idx_payments_participant ON public.payments(participant_id);
CREATE INDEX idx_badges_participant ON public.badges(participant_id);

ALTER TABLE public.badges ADD CONSTRAINT badges_participant_id_key UNIQUE (participant_id);

CREATE TABLE public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  scanned_by text
);

CREATE INDEX idx_checkins_participant ON public.checkins(participant_id);

GRANT SELECT, INSERT ON public.checkins TO anon, authenticated;
GRANT ALL ON public.checkins TO service_role;

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkins readable" ON public.checkins FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "checkins insertable" ON public.checkins FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Phase 2: auto-create a badge as soon as a participant is paid/confirmed
-- (instead of the client inserting it directly). Idempotent via the unique
-- constraint above so re-running on status updates is safe.
CREATE OR REPLACE FUNCTION public.create_badge_for_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token text;
BEGIN
  IF NEW.status IN ('paid', 'confirmed', 'checked_in') THEN
    token := substr(md5(random()::text || clock_timestamp()::text || NEW.id::text), 1, 16);
    INSERT INTO public.badges (participant_id, qr_payload, badge_url)
    VALUES (NEW.id, token, '/b/' || token)
    ON CONFLICT (participant_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_badge_insert
AFTER INSERT ON public.participants
FOR EACH ROW EXECUTE FUNCTION public.create_badge_for_participant();

CREATE TRIGGER trg_create_badge_update
AFTER UPDATE OF status ON public.participants
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION public.create_badge_for_participant();

-- Phase 4: scanning a badge marks the participant checked in
CREATE OR REPLACE FUNCTION public.mark_participant_checked_in()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.participants SET status = 'checked_in' WHERE id = NEW.participant_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mark_checked_in
AFTER INSERT ON public.checkins
FOR EACH ROW EXECUTE FUNCTION public.mark_participant_checked_in();
