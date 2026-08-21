-- Real inventory: only 10 "Stand exposant" (marché forain) and 25 "Stand
-- institutionnel" spots exist. Surfaced in the description shown on the
-- /inscription formule step (no stock-enforcement system exists yet --
-- this is informational copy only, matching what's shown on the landing
-- page's pricing cards).
UPDATE public.offers
SET description = 'Emplacement pour les deux jours. 10 stands disponibles.'
WHERE name = 'Stand exposant 9 m²';

UPDATE public.offers
SET description = 'Visibilité sur tous les supports. 25 stands disponibles.'
WHERE name = 'Stand institutionnel 9 m²';
