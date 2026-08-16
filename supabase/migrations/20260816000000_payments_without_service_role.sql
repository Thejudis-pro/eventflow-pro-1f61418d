-- The app's server code previously used the Supabase service-role key
-- (SUPABASE_SERVICE_ROLE_KEY) for three things: preparing a checkout
-- session, finalizing it with the PayTech redirect URL, and marking a
-- payment success/failed. That key lives in Supabase's own dashboard,
-- which isn't reachable through Lovable's managed-Supabase UI -- so
-- payments couldn't go live at all until that gap was closed.
--
-- Fix: move each of those operations into a SECURITY DEFINER RPC (the
-- same pattern already used by register_participant/get_registration/
-- find_registrations_by_email) so the app can do all of this with the
-- public anon key instead, which Lovable already exposes.
--
-- Creating a pending payment or attaching a checkout_url is low-risk to
-- expose to anon (mirrors register_participant's existing trust model:
-- worst case is a spurious pending row against a participant_id you'd
-- already have to know). Marking a payment success/failed is NOT
-- low-risk -- that's the one write that actually matters -- so
-- confirm_payment_secure additionally requires a server-only secret
-- (INTERNAL_PAYMENT_SECRET) that only this app's own server code knows,
-- the same shape as a webhook signing secret. Set the matching value as
-- a Lovable secret (same panel as PAYTECH_API_KEY etc. -- no Supabase
-- dashboard needed).

CREATE TABLE IF NOT EXISTS public._internal_config (
  key text PRIMARY KEY,
  value text NOT NULL
);
REVOKE ALL ON public._internal_config FROM PUBLIC, anon, authenticated;

INSERT INTO public._internal_config (key, value)
VALUES ('confirm_payment_secret', '2216d136fa6a9ec233af4ad32f67ba4650525256ba4f79969e629b3598bfb735')
ON CONFLICT (key) DO NOTHING;

-- 1. Prepare a checkout session: look up the amount server-side (never
-- trust a client-supplied price) and insert the pending payment row.
CREATE OR REPLACE FUNCTION public.prepare_payment_session(
  p_participant_id uuid,
  p_provider text
)
RETURNS TABLE (payment_id uuid, amount numeric, item_name text, registration_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_registration_id text;
  v_offer_price numeric;
  v_offer_name text;
  v_profile_price numeric;
  v_profile_label text;
  v_amount numeric;
  v_item_name text;
  v_payment_id uuid;
BEGIN
  SELECT p.registration_id, o.price, o.name, pt.price, pt.label
    INTO v_registration_id, v_offer_price, v_offer_name, v_profile_price, v_profile_label
  FROM public.participants p
  LEFT JOIN public.offers o ON o.id = p.offer_id
  LEFT JOIN public.profile_types pt ON pt.id = p.profile_type_id
  WHERE p.id = p_participant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;

  v_amount := coalesce(v_offer_price, v_profile_price);
  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'This registration has no amount due';
  END IF;

  v_item_name := 'FESA 2026 — ' || coalesce(v_offer_name, v_profile_label, 'Inscription');

  INSERT INTO public.payments (participant_id, provider, amount, status)
  VALUES (p_participant_id, p_provider, v_amount, 'pending')
  RETURNING id INTO v_payment_id;

  RETURN QUERY SELECT v_payment_id, v_amount, v_item_name, v_registration_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.prepare_payment_session(uuid, text) TO anon, authenticated;

-- 2. Attach the provider's checkout URL/session id once PayTech returns one.
CREATE OR REPLACE FUNCTION public.finalize_payment_checkout(
  p_payment_id uuid,
  p_checkout_url text,
  p_provider_session_id text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.payments
  SET checkout_url = p_checkout_url,
      provider_session_id = p_provider_session_id
  WHERE id = p_payment_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.finalize_payment_checkout(uuid, text, text) TO anon, authenticated;

-- 3. Mark a payment success/failed (and the participant paid). Secret-gated:
-- this is the one write that actually matters, so knowing a payment_id
-- alone must not be enough to call it.
CREATE OR REPLACE FUNCTION public.confirm_payment_secure(
  p_payment_id uuid,
  p_provider_session_id text,
  p_status text,
  p_webhook_payload jsonb,
  p_secret text
)
RETURNS TABLE (participant_id uuid, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_expected text;
  v_payment record;
BEGIN
  SELECT value INTO v_expected FROM public._internal_config WHERE key = 'confirm_payment_secret';
  IF v_expected IS NULL OR p_secret IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_status NOT IN ('success', 'failed') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  IF p_payment_id IS NULL AND p_provider_session_id IS NULL THEN
    RAISE EXCEPTION 'confirm_payment_secure requires p_payment_id or p_provider_session_id';
  END IF;

  SELECT id, payments.participant_id, payments.status INTO v_payment
  FROM public.payments
  WHERE (p_payment_id IS NOT NULL AND id = p_payment_id)
     OR (p_provider_session_id IS NOT NULL AND provider_session_id = p_provider_session_id)
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment not found';
  END IF;

  -- Idempotent: webhooks can legitimately fire more than once for the same event.
  IF v_payment.status <> 'pending' THEN
    RETURN QUERY SELECT v_payment.participant_id, v_payment.status;
    RETURN;
  END IF;

  UPDATE public.payments
  SET status = p_status, webhook_payload = p_webhook_payload
  WHERE id = v_payment.id;

  IF p_status = 'success' THEN
    UPDATE public.participants SET status = 'paid' WHERE id = v_payment.participant_id;
  END IF;

  RETURN QUERY SELECT v_payment.participant_id, p_status;
END;
$$;
GRANT EXECUTE ON FUNCTION public.confirm_payment_secure(uuid, text, text, jsonb, text) TO anon, authenticated;

-- 4. Dev-only mock-payment page lookup (PAYMENTS_MODE != "live" only,
-- enforced in application code) -- same low sensitivity as the RPCs above.
CREATE OR REPLACE FUNCTION public.get_mock_payment_details(p_payment_id uuid)
RETURNS TABLE (
  payment_id uuid, amount numeric, provider text, status text,
  full_name text, registration_id text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pay.id, pay.amount, pay.provider, pay.status, p.full_name, p.registration_id
  FROM public.payments pay
  JOIN public.participants p ON p.id = pay.participant_id
  WHERE pay.id = p_payment_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_mock_payment_details(uuid) TO anon, authenticated;
