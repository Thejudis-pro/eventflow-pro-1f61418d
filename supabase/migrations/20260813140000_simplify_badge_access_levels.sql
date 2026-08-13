-- Simplify every badge's zone box down to exactly two possible values
-- instead of 19 different zone descriptions. "Accès total" is reserved for
-- Staff d'organisation, Délégation officielle, Coordination and the
-- "Accès total" category itself; everyone else gets "Accès limité". Staff
-- can change this per category from the dashboard going forward.
UPDATE public.profile_types
SET zone_label = CASE
  WHEN label IN ('Accès total', 'Staff d''organisation', 'Délégation officielle', 'Coordination')
    THEN 'Accès total'
  ELSE 'Accès limité'
END;

-- profile_types had SELECT policies/grants only -- staff had no way to
-- change a category's access level (or anything else about it) from the app.
GRANT UPDATE ON public.profile_types TO authenticated;

CREATE POLICY "approved staff update profile_types" ON public.profile_types
  FOR UPDATE TO authenticated
  USING (public.is_approved_staff(auth.uid()))
  WITH CHECK (public.is_approved_staff(auth.uid()));
