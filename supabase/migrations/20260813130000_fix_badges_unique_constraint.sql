-- create_badge_for_participant() has used
-- `ON CONFLICT (participant_id) DO NOTHING` since 20260811144823, but the
-- UNIQUE constraint that clause depends on (badges_participant_id_key) is
-- missing from the live table -- confirmed live by calling
-- register_participant directly: every status transition into
-- paid/confirmed/checked_in fails with
-- "42P10: no unique or exclusion constraint matching ON CONFLICT".
-- This silently broke the public registration flow, the admin free-badge
-- form, and CSV delegation import alike.

-- Defensive dedupe in case any badges rows already slipped in without the
-- constraint enforcing uniqueness.
DELETE FROM public.badges a USING public.badges b
WHERE a.participant_id = b.participant_id AND a.id > b.id;

ALTER TABLE public.badges DROP CONSTRAINT IF EXISTS badges_participant_id_key;
ALTER TABLE public.badges ADD CONSTRAINT badges_participant_id_key UNIQUE (participant_id);
