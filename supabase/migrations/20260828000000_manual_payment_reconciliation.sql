-- Safety net for the case that just happened live: PayTech/Wave shows a
-- payment as completed, but the participant is stuck on "pending" because
-- the IPN webhook never reached /api/webhooks/paytech (or failed once it
-- got there). Until now the only way to fix that was a direct DB edit.
-- Staff-only (never anon), same is_approved_staff() gate already used by
-- reset_event_signups -- an authenticated approved-staff session is enough,
-- no INTERNAL_PAYMENT_SECRET needed, since this runs from the admin
-- dashboard where staff are already logged in.
CREATE OR REPLACE FUNCTION public.mark_payment_paid_by_staff(p_payment_id uuid)
RETURNS TABLE (participant_id uuid, registration_id text, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payment record;
BEGIN
  IF NOT public.is_approved_staff(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT id, payments.participant_id, payments.status INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment not found';
  END IF;

  -- Idempotent: safe to click twice, and won't un-fail an actually-failed
  -- payment by accident (only 'pending' -> 'success' is allowed here).
  IF v_payment.status = 'pending' THEN
    UPDATE public.payments SET status = 'success' WHERE id = v_payment.id;
    UPDATE public.participants SET status = 'paid' WHERE id = v_payment.participant_id;
  END IF;

  RETURN QUERY
    SELECT p.id, p.registration_id, p.status
    FROM public.participants p
    WHERE p.id = v_payment.participant_id;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_payment_paid_by_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_payment_paid_by_staff(uuid) TO authenticated;
