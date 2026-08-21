-- Staff could edit an existing badge category (zone_label via
-- AccessLevelManager) but never create a new one -- every category came
-- from a seed migration. Admin-only (not just any approved staff) since
-- this affects what shows up on the live registration form.
GRANT INSERT ON public.profile_types TO authenticated;

CREATE POLICY "admin staff insert profile_types" ON public.profile_types
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_staff(auth.uid()));
