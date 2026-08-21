-- Real stand inventory: 10 "Stand exposant" and 25 "Stand institutionnel"
-- spots. NULL total_quantity means unlimited (tickets).
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS total_quantity integer;

UPDATE public.offers SET total_quantity = 10 WHERE name = 'Stand exposant 9 m²';
UPDATE public.offers SET total_quantity = 25 WHERE name = 'Stand institutionnel 9 m²';

-- Public, aggregate-only (no participant data) count of how many spots are
-- taken per offer, so the registration wizard can show "X restants" and
-- disable a sold-out offer. Counts paid/confirmed/checked_in participants
-- -- pending ones haven't actually secured the spot yet.
CREATE OR REPLACE FUNCTION public.get_offer_sold_counts(p_event_id uuid)
RETURNS TABLE (offer_id uuid, sold_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, count(p.id)
  FROM public.offers o
  LEFT JOIN public.participants p
    ON p.offer_id = o.id AND p.status IN ('paid', 'confirmed', 'checked_in')
  WHERE o.event_id = p_event_id
  GROUP BY o.id;
$$;
GRANT EXECUTE ON FUNCTION public.get_offer_sold_counts(uuid) TO anon, authenticated;
