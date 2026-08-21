-- Role-based staff access: "checkin" staff should only ever see the
-- check-in scanner, not the full admin dashboard (participants, payments,
-- staff access management, etc). Defaults every existing/new row to
-- 'admin' so current staff keep exactly the access they have today --
-- someone has to explicitly demote an account to 'checkin' for the
-- restriction to take effect.
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'checkin'));

CREATE OR REPLACE FUNCTION public.is_admin_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles WHERE user_id = _user_id AND approved AND role = 'admin'
  );
$$;

-- Tightens a real gap along the way: "approved staff update profiles"
-- (20260813120000) let ANY approved staff update ANY row -- including
-- their own `role` column, so a checkin-role account could self-promote
-- back to admin via a raw table update. Only admins can change
-- approval/role now.
DROP POLICY IF EXISTS "approved staff update profiles" ON public.staff_profiles;
CREATE POLICY "admin staff update profiles" ON public.staff_profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin_staff(auth.uid()))
  WITH CHECK (public.is_admin_staff(auth.uid()));
