-- Staff-only "end of test phase" reset: wipes all participant-generated
-- data for an event (registrations, which cascade to their badges,
-- payments, and checkins; plus imported delegations and newsletter
-- signups) while leaving the event's own config -- profile_types, offers,
-- staff_profiles -- completely untouched. Only ever called from the admin
-- dashboard, gated behind an explicit type-to-confirm dialog client-side.
--
-- SECURITY DEFINER bypasses RLS entirely, so the is_approved_staff() check
-- inside the function body IS the real access control here, not the grant
-- alone -- granting to "authenticated" only stops anonymous callers, but
-- any logged-in user could otherwise invoke this without the internal check.
CREATE OR REPLACE FUNCTION public.reset_event_signups(p_event_id uuid)
RETURNS TABLE (participants_deleted bigint, delegations_deleted bigint, newsletter_deleted bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_participants bigint;
  v_delegations bigint;
  v_newsletter bigint;
BEGIN
  IF NOT public.is_approved_staff(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  DELETE FROM public.participants WHERE event_id = p_event_id;
  GET DIAGNOSTICS v_participants = ROW_COUNT;

  DELETE FROM public.delegations WHERE event_id = p_event_id;
  GET DIAGNOSTICS v_delegations = ROW_COUNT;

  DELETE FROM public.newsletter_subscribers WHERE event_id = p_event_id;
  GET DIAGNOSTICS v_newsletter = ROW_COUNT;

  RETURN QUERY SELECT v_participants, v_delegations, v_newsletter;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reset_event_signups(uuid) TO authenticated;
