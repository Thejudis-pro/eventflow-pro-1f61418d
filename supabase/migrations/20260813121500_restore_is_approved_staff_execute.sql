-- The prior security-lockdown migrations (20260813113201, 20260813113233)
-- revoked EXECUTE on is_approved_staff(uuid) from anon, authenticated, and
-- PUBLIC, but never granted it back to `authenticated`. Nearly every
-- staff-only RLS policy (participants, payments, badges, delegations,
-- checkins, profile_types, staff_profiles) calls this function internally,
-- so approved staff would get "permission denied for function
-- is_approved_staff" on any query that needs it.
GRANT EXECUTE ON FUNCTION public.is_approved_staff(uuid) TO authenticated;
