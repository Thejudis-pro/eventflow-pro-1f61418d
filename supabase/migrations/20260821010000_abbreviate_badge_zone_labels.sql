-- Shorten the badge zone box from "Accès total"/"Accès limité" to "AA"/"AL"
-- so it reads as a compact access-level code rather than a full phrase.
UPDATE public.profile_types SET zone_label = 'AA' WHERE zone_label = 'Accès total';
UPDATE public.profile_types SET zone_label = 'AL' WHERE zone_label = 'Accès limité';
