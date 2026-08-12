-- Diagnostic + safe re-seed for the offers table. Registration is falling
-- back to synthesized profile_type-based tickets, which only happens when
-- a plain `select * from offers` comes back empty client-side — meaning
-- either the INSERT in 20260812100000 matched 0 rows (most likely: the
-- hardcoded event UUID not matching pt.event_id for some reason), or RLS/
-- grants are blocking anon reads. This re-asserts both and reports state.
-- Safe to run more than once.

-- 1. Re-assert grants + policy (idempotent either way)
GRANT SELECT ON public.offers TO anon, authenticated;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offers readable" ON public.offers;
CREATE POLICY "offers readable" ON public.offers FOR SELECT TO anon, authenticated USING (true);

-- 2. Re-run the seed, resolving the event by slug instead of a hardcoded
-- UUID (in case that's ever been the mismatch), still guarded by NOT EXISTS
-- so re-running never duplicates rows.
DO $$
DECLARE
  ev_id uuid;
BEGIN
  SELECT id INTO ev_id FROM public.events WHERE slug = 'fesa26';
  IF ev_id IS NULL THEN
    RAISE NOTICE 'No event with slug fesa26 found — nothing to seed.';
    RETURN;
  END IF;

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

-- 3. Diagnostics — read the output of this in the SQL editor's results pane.
SELECT
  (SELECT id FROM public.events WHERE slug = 'fesa26') AS event_id,
  (SELECT count(*) FROM public.profile_types WHERE event_id = (SELECT id FROM public.events WHERE slug = 'fesa26') AND is_public) AS public_profile_types,
  (SELECT count(*) FROM public.offers WHERE event_id = (SELECT id FROM public.events WHERE slug = 'fesa26')) AS offers_count,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'offers') AS offers_policy_count,
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'offers') AS offers_rls_enabled;
