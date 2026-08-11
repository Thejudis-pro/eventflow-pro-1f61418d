-- Admin/staff accounts. Self-signup (Supabase Auth) creates a pending
-- profile; access to participant data requires `approved = true`, which is
-- flipped manually in the database (Supabase Table Editor / SQL) -- there is
-- no self-service approval flow by design.
CREATE TABLE public.staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_staff_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.staff_profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_staff_user();

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.staff_profiles TO authenticated;
GRANT ALL ON public.staff_profiles TO service_role;

-- A signed-in user may only read their own profile row (to check approval).
CREATE POLICY "own staff profile readable" ON public.staff_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_approved_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE user_id = auth.uid() AND approved = true
  );
$$;

-- Lock down participant data to approved staff only. The public site never
-- lists or bulk-reads this data; it only ever looks up a single known
-- registration through get_registration() below.
DROP POLICY "participants readable" ON public.participants;
CREATE POLICY "participants readable by staff" ON public.participants
  FOR SELECT TO authenticated USING (public.is_approved_staff());

DROP POLICY "payments readable" ON public.payments;
CREATE POLICY "payments readable by staff" ON public.payments
  FOR SELECT TO authenticated USING (public.is_approved_staff());

DROP POLICY "delegations readable" ON public.delegations;
CREATE POLICY "delegations readable by staff" ON public.delegations
  FOR SELECT TO authenticated USING (public.is_approved_staff());

DROP POLICY "badges readable" ON public.badges;
CREATE POLICY "badges readable by staff" ON public.badges
  FOR SELECT TO authenticated USING (public.is_approved_staff());

DROP POLICY "checkins readable" ON public.checkins;
CREATE POLICY "checkins readable by staff" ON public.checkins
  FOR SELECT TO authenticated USING (public.is_approved_staff());

-- Check-in scanning is a staff-only action now that /checkin sits behind login.
DROP POLICY "checkins insertable" ON public.checkins;
CREATE POLICY "checkins insertable by staff" ON public.checkins
  FOR INSERT TO authenticated WITH CHECK (public.is_approved_staff());
REVOKE INSERT ON public.checkins FROM anon;

-- The public registration form can no longer read participants/badges back
-- (no SELECT policy for anon), so the insert itself moves into a
-- SECURITY DEFINER RPC that returns just the new registration_id.
CREATE OR REPLACE FUNCTION public.register_participant(
  p_event_id uuid,
  p_profile_type_id uuid,
  p_delegation_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_company text,
  p_function text,
  p_sector text,
  p_status text
)
RETURNS TABLE (id uuid, registration_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  new_reg_id text;
BEGIN
  IF p_status NOT IN ('pending', 'paid', 'confirmed') THEN
    RAISE EXCEPTION 'invalid status for a new registration: %', p_status;
  END IF;

  INSERT INTO public.participants
    (event_id, profile_type_id, delegation_id, full_name, email, phone, company, function, sector, status)
  VALUES
    (p_event_id, p_profile_type_id, p_delegation_id, p_full_name, p_email, p_phone, p_company, p_function, p_sector, p_status)
  RETURNING participants.id, participants.registration_id INTO new_id, new_reg_id;

  RETURN QUERY SELECT new_id, new_reg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_participant(uuid, uuid, uuid, text, text, text, text, text, text, text) TO anon, authenticated;

-- Public confirmation page: look up exactly one registration by its id,
-- never a bulk listing.
CREATE OR REPLACE FUNCTION public.get_registration(p_registration_id text)
RETURNS TABLE (
  full_name text,
  function text,
  company text,
  profile_label text,
  profile_color text,
  registration_id text,
  status text,
  qr_payload text,
  badge_url text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.full_name, p.function, p.company, pt.label, pt.color_code,
         p.registration_id, p.status, b.qr_payload, b.badge_url
  FROM public.participants p
  LEFT JOIN public.profile_types pt ON pt.id = p.profile_type_id
  LEFT JOIN public.badges b ON b.participant_id = p.id
  WHERE p.registration_id = p_registration_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_registration(text) TO anon, authenticated;

-- Public registration form's "existing delegation" dropdown only needs the
-- name, never the delegation's contact email/phone.
CREATE OR REPLACE FUNCTION public.list_delegation_names(p_event_id uuid)
RETURNS TABLE (id uuid, primary_contact_name text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id, primary_contact_name FROM public.delegations
  WHERE event_id = p_event_id
  ORDER BY primary_contact_name;
$$;

GRANT EXECUTE ON FUNCTION public.list_delegation_names(uuid) TO anon, authenticated;
