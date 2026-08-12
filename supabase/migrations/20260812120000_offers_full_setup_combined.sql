-- Combined, fully idempotent re-run of everything from 20260812100000 plus
-- the offers fix. If "relation public.offers does not exist" showed up,
-- that migration may never have actually run — this makes sure every piece
-- (category colors, offers table, RPC signatures, payments columns) is
-- live regardless of what partially applied before. Safe to run more than
-- once; every step uses IF NOT EXISTS / DROP+CREATE / NOT EXISTS guards.
-- Run this ONE script start to finish in the SQL editor.

-- ============================================================
-- 1. profile_types: badge-rendering columns + 19-category reconciliation
-- ============================================================
ALTER TABLE public.profile_types ADD COLUMN IF NOT EXISTS badge_prefix text;
ALTER TABLE public.profile_types ADD COLUMN IF NOT EXISTS ink_color text NOT NULL DEFAULT '#ffffff';
ALTER TABLE public.profile_types ADD COLUMN IF NOT EXISTS zone_label text;

DO $$
DECLARE
  ev_id uuid;
  navy CONSTANT text := '#0b2d5c';
  green CONSTANT text := '#0b7a3c';
  gold CONSTANT text := '#f2b632';
  red CONSTANT text := '#b8321f';
  ink CONSTANT text := '#201e1d';
  slate CONSTANT text := '#5a6b8a';
  vip_id uuid;
  acc_id uuid;
BEGIN
  SELECT id INTO ev_id FROM public.events WHERE slug = 'fesa26';
  IF ev_id IS NULL THEN
    RAISE EXCEPTION 'No event with slug fesa26 found in public.events.';
  END IF;

  SELECT id INTO vip_id FROM public.profile_types WHERE event_id = ev_id AND label = 'VIP';
  SELECT id INTO acc_id FROM public.profile_types WHERE event_id = ev_id AND label = 'Accès total';
  IF vip_id IS NOT NULL AND acc_id IS NOT NULL THEN
    UPDATE public.participants SET profile_type_id = acc_id WHERE profile_type_id = vip_id;
    DELETE FROM public.profile_types WHERE id = vip_id;
  END IF;

  UPDATE public.profile_types SET color_code = navy, ink_color = '#ffffff', zone_label = 'TOUTES ZONES', badge_prefix = 'ACC' WHERE event_id = ev_id AND label = 'Accès total';
  UPDATE public.profile_types SET color_code = red, ink_color = '#ffffff', zone_label = 'ZONE MÉDIAS', badge_prefix = 'PRE' WHERE event_id = ev_id AND label = 'Presse / Médias';
  UPDATE public.profile_types SET color_code = ink, ink_color = '#ffffff', zone_label = 'TOUTES ZONES', badge_prefix = 'ORG' WHERE event_id = ev_id AND label = 'Staff d''organisation';
  UPDATE public.profile_types SET color_code = green, ink_color = '#ffffff', zone_label = 'ZONES PUBLIQUES', badge_prefix = 'PAR' WHERE event_id = ev_id AND label = 'Participant';
  UPDATE public.profile_types SET color_code = navy, ink_color = '#ffffff', zone_label = 'SALLES + SCÈNE', badge_prefix = 'SCI' WHERE event_id = ev_id AND label = 'Comité scientifique';
  UPDATE public.profile_types SET color_code = green, ink_color = '#ffffff', zone_label = 'ZONES ASSIGNÉES', badge_prefix = 'VOL' WHERE event_id = ev_id AND label = 'Volontaire';
  UPDATE public.profile_types SET color_code = ink, ink_color = '#ffffff', zone_label = 'TOUTES ZONES', badge_prefix = 'COO' WHERE event_id = ev_id AND label = 'Coordination';
  UPDATE public.profile_types SET color_code = gold, ink_color = ink, zone_label = 'HALL D''EXPOSITION', badge_prefix = 'EXP' WHERE event_id = ev_id AND label = 'Exposant';
  UPDATE public.profile_types SET color_code = navy, ink_color = '#ffffff', zone_label = 'ACCÈS TOTAL + VIP', badge_prefix = 'DEL' WHERE event_id = ev_id AND label = 'Délégation officielle';
  UPDATE public.profile_types SET color_code = slate, ink_color = '#ffffff', zone_label = 'SALLES DE SESSION', badge_prefix = 'RAP' WHERE event_id = ev_id AND label = 'Rapporteur';
  UPDATE public.profile_types SET color_code = gold, ink_color = ink, zone_label = 'ZONES PUBLIQUES + VIP', badge_prefix = 'PTN' WHERE event_id = ev_id AND label = 'Partenaire';
  UPDATE public.profile_types SET label = 'Hôtesse d''accueil', color_code = green, ink_color = '#ffffff', zone_label = 'ACCUEIL + HALLS', badge_prefix = 'HOT' WHERE event_id = ev_id AND label = 'Hôtesse';
  UPDATE public.profile_types SET color_code = gold, ink_color = ink, zone_label = 'SCÈNE + SALONS', badge_prefix = 'PAN' WHERE event_id = ev_id AND label = 'Panéliste';
  UPDATE public.profile_types SET color_code = slate, ink_color = '#ffffff', zone_label = 'ESPACES RESTAURATION', badge_prefix = 'RES' WHERE event_id = ev_id AND label = 'Restauration';
  UPDATE public.profile_types SET color_code = red, ink_color = '#ffffff', zone_label = 'TOUTES ZONES', badge_prefix = 'COM' WHERE event_id = ev_id AND label = 'Communication';
  UPDATE public.profile_types SET color_code = slate, ink_color = '#ffffff', zone_label = 'CABINES + SALLES', badge_prefix = 'INT' WHERE event_id = ev_id AND label = 'Interprète';
  UPDATE public.profile_types SET color_code = gold, ink_color = ink, zone_label = 'SCÈNE + SALONS', badge_prefix = 'MOD' WHERE event_id = ev_id AND label = 'Modérateur';
  UPDATE public.profile_types SET color_code = navy, ink_color = '#ffffff', zone_label = 'TOUTES ZONES', badge_prefix = 'PRO' WHERE event_id = ev_id AND label = 'Protocole';
  UPDATE public.profile_types SET color_code = ink, ink_color = '#ffffff', zone_label = 'RÉGIE + BACKSTAGE', badge_prefix = 'TEC' WHERE event_id = ev_id AND label = 'Staff technique';
END $$;

ALTER TABLE public.profile_types DROP CONSTRAINT IF EXISTS profile_types_badge_prefix_key;
ALTER TABLE public.profile_types ADD CONSTRAINT profile_types_badge_prefix_key UNIQUE (event_id, badge_prefix);

-- ============================================================
-- 2. offers table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  profile_type_id uuid NOT NULL REFERENCES public.profile_types(id),
  kicker text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(12,2) NOT NULL,
  unit_label text NOT NULL DEFAULT 'par badge',
  included_badges int NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  perks text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.offers TO anon, authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offers readable" ON public.offers;
CREATE POLICY "offers readable" ON public.offers FOR SELECT TO anon, authenticated USING (true);

DO $$
DECLARE
  ev_id uuid;
BEGIN
  SELECT id INTO ev_id FROM public.events WHERE slug = 'fesa26';

  INSERT INTO public.offers (event_id, profile_type_id, kicker, name, description, price, unit_label, included_badges, sort_order, perks)
  SELECT ev_id, pt.id, v.kicker, v.name, v.description, v.price, v.unit_label, v.included_badges, v.sort_order, v.perks
  FROM (VALUES
    ('Participant', 'TICKET', 'Participant sénégalais', 'Pour les deux journées.', 10000::numeric, 'par badge', 0, 1,
      ARRAY['Plénières et panels','Ateliers thématiques','Espace exposition','Badge nominatif QR','Attestation de participation']),
    ('Participant', 'TICKET', 'Participant non-sénégalais', 'Délégations des pays invités et autres.', 20000::numeric, 'par badge', 0, 2,
      ARRAY['Plénières et panels','Ateliers thématiques','Espace exposition','Badge nominatif QR','Attestation de participation']),
    ('Exposant', 'MARCHÉ FORAIN', 'Stand exposant 9 m²', 'Emplacement pour les deux jours.', 200000::numeric, 'par stand', 2, 3,
      ARRAY['Stand équipé avec mobilier de base (table + 2 chaises + panneau nom)','2 badges gratuits','Accès site du forum']),
    ('Partenaire', 'ESPACE INSTITUTIONNEL', 'Stand institutionnel 12 m²', 'Visibilité sur tous les supports.', 1500000::numeric, 'par stand', 3, 4,
      ARRAY['Logo sur tous les supports','3 badges gratuits','Accès B2B'])
  ) AS v(profile_label, kicker, name, description, price, unit_label, included_badges, sort_order, perks)
  JOIN public.profile_types pt ON pt.event_id = ev_id AND pt.label = v.profile_label
  WHERE NOT EXISTS (
    SELECT 1 FROM public.offers o WHERE o.event_id = ev_id AND o.name = v.name
  );
END $$;

-- ============================================================
-- 3. participants + payments columns
-- ============================================================
-- country predates this script (20260811211151) but errored as missing
-- live, so it's re-asserted here defensively alongside the columns this
-- script actually owns.
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.offers(id);
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS badge_quantity integer NOT NULL DEFAULT 1;

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS webhook_payload jsonb;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS checkout_url text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_session_id text;
CREATE INDEX IF NOT EXISTS idx_payments_provider_session ON public.payments(provider_session_id);
REVOKE INSERT ON public.payments FROM anon;

-- ============================================================
-- 4. RPCs
-- ============================================================
DROP FUNCTION IF EXISTS public.register_participant(uuid, uuid, text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.register_participant(
  p_event_id uuid, p_profile_type_id uuid, p_offer_id uuid, p_delegation_id text,
  p_full_name text, p_email text, p_phone text,
  p_company text, p_function text, p_sector text, p_status text,
  p_country text, p_city text, p_badge_quantity integer DEFAULT 1
)
RETURNS TABLE (id uuid, registration_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; new_reg text;
BEGIN
  IF coalesce(trim(p_full_name),'') = '' OR coalesce(trim(p_email),'') = '' THEN
    RAISE EXCEPTION 'full_name and email are required';
  END IF;
  IF p_status NOT IN ('pending','confirmed','paid') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  INSERT INTO public.participants (
    event_id, profile_type_id, offer_id, delegation_id, full_name, email, phone,
    company, function, sector, status, country, city, badge_quantity
  ) VALUES (
    p_event_id, p_profile_type_id, p_offer_id, nullif(trim(coalesce(p_delegation_id,'')),'')::uuid,
    trim(p_full_name), lower(trim(p_email)),
    nullif(trim(coalesce(p_phone,'')),''),
    nullif(trim(coalesce(p_company,'')),''),
    nullif(trim(coalesce(p_function,'')),''),
    nullif(trim(coalesce(p_sector,'')),''),
    p_status,
    nullif(trim(coalesce(p_country,'')),''),
    nullif(trim(coalesce(p_city,'')),''),
    greatest(coalesce(p_badge_quantity, 1), 1)
  )
  RETURNING participants.id, participants.registration_id INTO new_id, new_reg;
  RETURN QUERY SELECT new_id, new_reg;
END;
$$;
GRANT EXECUTE ON FUNCTION public.register_participant(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,text,integer) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_registration(text);

CREATE OR REPLACE FUNCTION public.get_registration(p_registration_id text)
RETURNS TABLE (
  full_name text, function text, company text, country text, city text,
  profile_label text, profile_color text, profile_ink text, zone_label text, badge_prefix text,
  offer_name text, registration_id text, status text, qr_payload text, badge_url text,
  payment_status text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.full_name, p.function, p.company, p.country, p.city,
         pt.label, pt.color_code, pt.ink_color, pt.zone_label, pt.badge_prefix,
         o.name, p.registration_id, p.status, b.qr_payload, b.badge_url,
         pay.status
  FROM public.participants p
  LEFT JOIN public.profile_types pt ON pt.id = p.profile_type_id
  LEFT JOIN public.offers o ON o.id = p.offer_id
  LEFT JOIN public.badges b ON b.participant_id = p.id
  LEFT JOIN LATERAL (
    SELECT status FROM public.payments WHERE participant_id = p.id ORDER BY created_at DESC LIMIT 1
  ) pay ON true
  WHERE p.registration_id = p_registration_id
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_registration(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.find_registrations_by_email(p_event_id uuid, p_email text)
RETURNS TABLE (registration_id text, full_name text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT registration_id, full_name, status FROM public.participants
  WHERE event_id = p_event_id AND email = lower(trim(p_email))
  ORDER BY created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.find_registrations_by_email(uuid, text) TO anon, authenticated;

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
    VALUES (NEW.id, token, '/confirmation/' || NEW.registration_id)
    ON CONFLICT (participant_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. Diagnostics — check this result row.
-- ============================================================
SELECT
  (SELECT id FROM public.events WHERE slug = 'fesa26') AS event_id,
  (SELECT count(*) FROM public.profile_types WHERE event_id = (SELECT id FROM public.events WHERE slug = 'fesa26') AND is_public) AS public_profile_types,
  (SELECT count(*) FROM public.offers WHERE event_id = (SELECT id FROM public.events WHERE slug = 'fesa26')) AS offers_count,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'offers') AS offers_policy_count,
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'offers') AS offers_rls_enabled,
  (SELECT count(*) FROM pg_proc WHERE proname = 'register_participant') AS register_participant_overloads;
