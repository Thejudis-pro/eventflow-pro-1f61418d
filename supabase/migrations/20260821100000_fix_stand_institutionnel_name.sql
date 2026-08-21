-- 20260821030000/20260821060000/20260821070000 all tried to update "Stand
-- institutionnel" by matching WHERE name = 'Stand institutionnel 9 m²' --
-- but the offer was never actually renamed from its original "12 m²", so
-- every one of those UPDATEs silently matched zero rows (confirmed live:
-- total_quantity was still NULL and the name still said "12 m²"). Renames
-- it for real this time, then re-applies the quantity/description those
-- earlier migrations meant to set.
UPDATE public.offers
SET
  name = 'Stand institutionnel 9 m²',
  total_quantity = 25,
  description = 'Visibilité sur tous les supports. 25 stands disponibles.'
WHERE name = 'Stand institutionnel 12 m²';
