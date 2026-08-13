-- Non-Senegalese participant price is now pegged to 20 EUR
-- (20 * 655.957 XOF/EUR ≈ 13 119 FCFA, rounded to 13 120).
UPDATE public.offers
SET price = 13120::numeric,
    description = 'Délégations des pays invités et autres. Équivalent 20 €.'
WHERE name = 'Participant non-sénégalais';

-- Forum venue is CICES (Centre International du Commerce Extérieur du Sénégal), Dakar.
UPDATE public.events
SET location = 'CICES, Dakar, Sénégal'
WHERE slug = 'fesa26';
