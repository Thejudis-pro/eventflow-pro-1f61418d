-- Daily backup of key admin data (participants + payments), triggered by an
-- external cron (this project has no Postgres/edge-function scheduler of its
-- own) hitting a new server route which calls this RPC. Same secret-gated
-- SECURITY DEFINER pattern as confirm_payment_secure -- avoids needing the
-- Supabase service-role key, which Lovable's managed setup doesn't expose.

CREATE TABLE IF NOT EXISTS public.event_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  participants_count integer NOT NULL,
  payments_count integer NOT NULL,
  payload jsonb NOT NULL
);
ALTER TABLE public.event_backups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_backups FROM PUBLIC, anon, authenticated;

-- Builds the snapshot (full participant + payment detail, minus raw
-- provider/webhook payloads which aren't "key info" and can carry
-- provider-side tokens), stores it, and returns it in one round trip so the
-- calling route can email it without a second query.
CREATE OR REPLACE FUNCTION public.run_daily_backup_secure(
  p_event_id uuid,
  p_secret text
)
RETURNS TABLE (id uuid, payload jsonb, participants_count integer, payments_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_expected text;
  v_participants jsonb;
  v_participants_count integer;
  v_payments jsonb;
  v_payments_count integer;
  v_payload jsonb;
  v_id uuid;
BEGIN
  SELECT value INTO v_expected FROM public._internal_config WHERE key = 'confirm_payment_secret';
  IF v_expected IS NULL OR p_secret IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'registration_id', p.registration_id,
      'full_name', p.full_name,
      'email', p.email,
      'phone', p.phone,
      'company', p.company,
      'sector', p.sector,
      'function', p.function,
      'country', p.country,
      'city', p.city,
      'badge_quantity', p.badge_quantity,
      'status', p.status,
      'profile_label', pt.label,
      'offer_name', o.name,
      'delegation_id', p.delegation_id,
      'created_at', p.created_at
    ) ORDER BY p.created_at), '[]'::jsonb), count(*)
    INTO v_participants, v_participants_count
  FROM public.participants p
  LEFT JOIN public.profile_types pt ON pt.id = p.profile_type_id
  LEFT JOIN public.offers o ON o.id = p.offer_id
  WHERE p.event_id = p_event_id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', pay.id,
      'participant_id', pay.participant_id,
      'registration_id', pt.registration_id,
      'provider', pay.provider,
      'amount', pay.amount,
      'status', pay.status,
      'provider_transaction_id', pay.provider_transaction_id,
      'created_at', pay.created_at
    ) ORDER BY pay.created_at), '[]'::jsonb), count(*)
    INTO v_payments, v_payments_count
  FROM public.payments pay
  JOIN public.participants pt ON pt.id = pay.participant_id
  WHERE pt.event_id = p_event_id;

  v_payload := jsonb_build_object(
    'event_id', p_event_id,
    'generated_at', now(),
    'participants', v_participants,
    'payments', v_payments
  );

  INSERT INTO public.event_backups (event_id, payload, participants_count, payments_count)
  VALUES (p_event_id, v_payload, v_participants_count, v_payments_count)
  RETURNING event_backups.id INTO v_id;

  RETURN QUERY SELECT v_id, v_payload, v_participants_count, v_payments_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.run_daily_backup_secure(uuid, text) TO anon, authenticated;
