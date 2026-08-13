-- 1) Lock down internal SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.create_badge_for_participant() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_participant_checked_in() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.set_registration_id() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_approved_staff(uuid) FROM anon, authenticated;

-- Drop the obsolete overload of register_participant (superseded by the 14-arg version)
DROP FUNCTION IF EXISTS public.register_participant(uuid, uuid, text, text, text, text, text, text, text, text);

-- Staff-only helper: no anonymous execution
REVOKE ALL ON FUNCTION public.ensure_staff_profile() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_staff_profile() TO authenticated;

-- Public-facing RPCs keep explicit, minimal grants
GRANT EXECUTE ON FUNCTION public.register_participant(uuid, uuid, uuid, text, text, text, text, text, text, text, text, text, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_registration(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_registrations_by_email(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_delegation_names(uuid) TO anon, authenticated;

-- 2) Payments: remove unrestricted public insert
DROP POLICY IF EXISTS "payments insertable" ON public.payments;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM anon, authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

-- 3) Participants: keep table writes closed at the privilege level too
REVOKE INSERT, DELETE ON public.participants FROM anon, authenticated;
REVOKE ALL ON public.participants FROM anon;
GRANT SELECT, UPDATE ON public.participants TO authenticated;
GRANT ALL ON public.participants TO service_role;

-- 4) profile_types: anonymous visitors only see public registration profiles
DROP POLICY IF EXISTS "profile_types readable" ON public.profile_types;
CREATE POLICY "public profile types readable by anyone"
  ON public.profile_types FOR SELECT TO anon USING (is_public);
CREATE POLICY "authenticated read public profile types"
  ON public.profile_types FOR SELECT TO authenticated
  USING (is_public OR public.is_approved_staff(auth.uid()));
