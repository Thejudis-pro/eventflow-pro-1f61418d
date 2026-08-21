-- The static "10/25 stands disponibles" text in these descriptions
-- (20260821030000) is now redundant with -- and would immediately drift
-- out of sync with -- the live "X places restantes" counter the
-- registration wizard shows under each offer (get_offer_sold_counts,
-- 20260821060000).
UPDATE public.offers
SET description = 'Emplacement pour les deux jours.'
WHERE name = 'Stand exposant 9 m²';

UPDATE public.offers
SET description = 'Visibilité sur tous les supports.'
WHERE name = 'Stand institutionnel 9 m²';
