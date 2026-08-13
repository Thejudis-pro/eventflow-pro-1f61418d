-- staff_profiles had SELECT policies (own row, or all rows if already
-- approved) but no UPDATE grant/policy at all, so "approving" a staff
-- account required hand-editing the table in Supabase Studio -- there was no
-- way to flip `approved` from inside the app, even for an already-approved
-- admin. This adds a real approve/revoke path.
GRANT UPDATE ON public.staff_profiles TO authenticated;

CREATE POLICY "approved staff update profiles" ON public.staff_profiles
  FOR UPDATE TO authenticated
  USING (public.is_approved_staff(auth.uid()))
  WITH CHECK (public.is_approved_staff(auth.uid()));

-- Bootstrap: approve the account currently stuck on "Compte en attente de
-- validation" so there's at least one approved admin able to use the new
-- access-management UI.
UPDATE public.staff_profiles
SET approved = true
WHERE lower(email) = 'judismetognon@gmail.com';
