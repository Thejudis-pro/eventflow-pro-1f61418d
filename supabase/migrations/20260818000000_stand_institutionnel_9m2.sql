-- All stands are 9 m² -- the institutional stand offer was seeded (and
-- displayed) as 12 m², should match the exposant stand's size.
UPDATE public.offers
SET name = 'Stand institutionnel 9 m²'
WHERE name = 'Stand institutionnel 12 m²';
