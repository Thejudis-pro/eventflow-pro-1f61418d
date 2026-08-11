-- Full accreditation badge category system (20 categories). Only a few are
-- self-selectable on the public registration form (is_public); the rest are
-- assigned by staff from the dashboard.
ALTER TABLE public.profile_types ADD COLUMN is_public boolean NOT NULL DEFAULT false;

DO $$
DECLARE
  ev_id uuid := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- Relabel the original 5 categories in place so existing participants
  -- (and the demo seed) keep a valid, meaningful profile_type_id.
  UPDATE public.profile_types SET label = 'Participant', is_public = true, requires_payment = true, price = 10000, sort_order = 1
    WHERE event_id = ev_id AND label = 'Standard';
  UPDATE public.profile_types SET label = 'Exposant', is_public = true, requires_payment = true, price = 200000, sort_order = 2
    WHERE event_id = ev_id AND label = 'Entrepreneur';
  UPDATE public.profile_types SET label = 'Partenaire', is_public = true, requires_payment = true, price = 1500000, sort_order = 3
    WHERE event_id = ev_id AND label = 'Institution/Partenaire';
  UPDATE public.profile_types SET is_public = false, requires_payment = false, price = NULL, sort_order = 4
    WHERE event_id = ev_id AND label = 'VIP';
  UPDATE public.profile_types SET label = 'Presse / Médias', is_public = false, requires_payment = false, price = NULL, sort_order = 5
    WHERE event_id = ev_id AND label = 'Presse';

  -- New staff-assigned-only categories.
  INSERT INTO public.profile_types (event_id, label, color_code, requires_payment, price, sort_order, is_public) VALUES
    (ev_id, 'Accès total', '#B8860B', false, NULL, 10, false),
    (ev_id, 'Délégation officielle', '#283593', false, NULL, 11, false),
    (ev_id, 'Comité scientifique', '#00695C', false, NULL, 12, false),
    (ev_id, 'Panéliste', '#7B1FA2', false, NULL, 13, false),
    (ev_id, 'Rapporteur', '#6D4C41', false, NULL, 14, false),
    (ev_id, 'Modérateur', '#3949AB', false, NULL, 15, false),
    (ev_id, 'Communication', '#0097A7', false, NULL, 16, false),
    (ev_id, 'Interprète', '#4527A0', false, NULL, 17, false),
    (ev_id, 'Staff d''organisation', '#455A64', false, NULL, 18, false),
    (ev_id, 'Coordination', '#00838F', false, NULL, 19, false),
    (ev_id, 'Protocole', '#33691E', false, NULL, 20, false),
    (ev_id, 'Staff technique', '#37474F', false, NULL, 21, false),
    (ev_id, 'Hôtesse', '#D81B60', false, NULL, 22, false),
    (ev_id, 'Volontaire', '#689F38', false, NULL, 23, false),
    (ev_id, 'Restauration', '#9E9D24', false, NULL, 24, false);
END $$;
