-- Fixes for a security audit run against this project. Three real issues:
--
-- 1. CRITICAL: register_participant took p_status as a plain client-supplied
--    argument, only checked against the enum ('pending','confirmed','paid').
--    Nothing stopped anyone from calling this RPC directly (bypassing the
--    /inscription UI entirely) with a paid profile/offer and
--    p_status='confirmed' -- an instant free badge for any tier, since the
--    create_badge_for_participant trigger fires on any status IN
--    ('paid','confirmed','checked_in'). Status is now derived server-side
--    from the real offer/profile price, the same way prepare_payment_session
--    already refuses to trust a client-supplied amount. The one legitimate
--    exception -- staff creating deliberate free/comp badges for a paid tier
--    (CreateFreeBadgeForm: press, VIP, staff passes) -- is preserved via an
--    is_approved_staff() check, so only an authenticated approved staff
--    member can still force a paid tier straight to confirmed.
--
-- 2. CRITICAL: public._internal_config (holds confirm_payment_secret) had
--    all grants revoked from anon/authenticated/PUBLIC, which blocks
--    PostgREST access today, but the table never had Row Level Security
--    enabled -- meaning a future migration that does a blanket
--    `GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated` (a
--    common broad-grant pattern) would silently re-expose it. RLS with zero
--    policies is a second, independent lock: SECURITY DEFINER functions
--    (running as the table owner) bypass RLS and keep working, but nothing
--    else can ever read this table via PostgREST no matter what grants
--    exist later.
--
-- 3. CRITICAL: the confirm_payment_secret value was hardcoded in
--    20260816000000_payments_without_service_role.sql and committed to git.
--    That specific value is now permanently in this repo's history and
--    can't be un-committed from here -- clearing it is necessary but not
--    sufficient; the value itself should be rotated (generate a new random
--    secret, set it as INTERNAL_PAYMENT_SECRET in Lovable, republish, then
--    POST /api/sync-payment-secret to write the new value here). Going
--    forward the real value only ever lives in Lovable's env secret and
--    gets synced into this table by that endpoint -- never in a migration
--    file again.

CREATE OR REPLACE FUNCTION public.register_participant(
  p_event_id uuid, p_profile_type_id uuid, p_offer_id uuid, p_delegation_id text,
  p_full_name text, p_email text, p_phone text,
  p_company text, p_function text, p_sector text, p_status text,
  p_country text, p_city text, p_badge_quantity integer DEFAULT 1
)
RETURNS TABLE (id uuid, registration_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id uuid; new_reg text;
  v_offer_price numeric; v_profile_price numeric; v_amount numeric;
  v_status text;
BEGIN
  IF coalesce(trim(p_full_name),'') = '' OR coalesce(trim(p_email),'') = '' THEN
    RAISE EXCEPTION 'full_name and email are required';
  END IF;
  IF p_status NOT IN ('pending','confirmed','paid') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  SELECT price INTO v_offer_price FROM public.offers WHERE id = p_offer_id;
  SELECT price INTO v_profile_price FROM public.profile_types WHERE id = p_profile_type_id;
  v_amount := coalesce(v_offer_price, v_profile_price, 0);

  IF p_status IN ('confirmed', 'paid') AND v_amount > 0 AND NOT public.is_approved_staff(auth.uid()) THEN
    v_status := 'pending';
  ELSE
    v_status := p_status;
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
    v_status,
    nullif(trim(coalesce(p_country,'')),''),
    nullif(trim(coalesce(p_city,'')),''),
    greatest(coalesce(p_badge_quantity, 1), 1)
  )
  RETURNING participants.id, participants.registration_id INTO new_id, new_reg;
  RETURN QUERY SELECT new_id, new_reg;
END;
$$;
GRANT EXECUTE ON FUNCTION public.register_participant(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,text,integer) TO anon, authenticated;

ALTER TABLE public._internal_config ENABLE ROW LEVEL SECURITY;

UPDATE public._internal_config SET value = '' WHERE key = 'confirm_payment_secret';
