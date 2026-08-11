-- 1. Staff accounts
CREATE TABLE public.staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_profiles TO authenticated;
GRANT ALL ON public.staff_profiles TO service_role;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read own profile" ON public.staff_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_approved_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff_profiles WHERE user_id = _user_id AND approved);
$$;

CREATE POLICY "approved staff read all profiles" ON public.staff_profiles
  FOR SELECT TO authenticated USING (public.is_approved_staff(auth.uid()));

-- Self-provisioning of the staff row (no auth-schema triggers allowed)
CREATE OR REPLACE FUNCTION public.ensure_staff_profile()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.staff_profiles (user_id, email, full_name)
  SELECT u.id, u.email, u.raw_user_meta_data->>'full_name'
  FROM auth.users u WHERE u.id = auth.uid()
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_staff_profile() TO authenticated;

-- 2. Check-ins
CREATE TABLE public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  scanned_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.checkins TO authenticated;
GRANT ALL ON public.checkins TO service_role;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read checkins" ON public.checkins
  FOR SELECT TO authenticated USING (public.is_approved_staff(auth.uid()));
CREATE POLICY "staff insert checkins" ON public.checkins
  FOR INSERT TO authenticated WITH CHECK (public.is_approved_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.mark_participant_checked_in()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.participants SET status = 'checked_in' WHERE id = NEW.participant_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_mark_participant_checked_in
AFTER INSERT ON public.checkins FOR EACH ROW EXECUTE FUNCTION public.mark_participant_checked_in();

-- 3. Automatic badge creation
CREATE OR REPLACE FUNCTION public.create_badge_for_participant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('confirmed','paid','checked_in') THEN
    INSERT INTO public.badges (participant_id, qr_payload, badge_url)
    SELECT NEW.id, 'FESA26|' || NEW.registration_id, '/badge/' || NEW.registration_id
    WHERE NOT EXISTS (SELECT 1 FROM public.badges b WHERE b.participant_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_create_badge_insert
AFTER INSERT ON public.participants FOR EACH ROW EXECUTE FUNCTION public.create_badge_for_participant();
CREATE TRIGGER trg_create_badge_update
AFTER UPDATE OF status ON public.participants FOR EACH ROW EXECUTE FUNCTION public.create_badge_for_participant();

-- 4. Public RPCs (anonymous visitors get no direct table reads)
CREATE OR REPLACE FUNCTION public.register_participant(
  p_event_id uuid, p_profile_type_id uuid, p_delegation_id uuid,
  p_full_name text, p_email text, p_phone text,
  p_company text, p_function text, p_sector text, p_status text
)
RETURNS TABLE (id uuid, registration_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; new_reg text;
BEGIN
  IF coalesce(trim(p_full_name),'') = '' OR coalesce(trim(p_email),'') = '' THEN
    RAISE EXCEPTION 'full_name and email are required';
  END IF;
  IF p_status NOT IN ('pending','confirmed','paid') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  INSERT INTO public.participants (
    event_id, profile_type_id, delegation_id, full_name, email, phone,
    company, function, sector, status
  ) VALUES (
    p_event_id, p_profile_type_id, p_delegation_id, trim(p_full_name), lower(trim(p_email)),
    nullif(trim(coalesce(p_phone,'')),''), p_company, p_function, p_sector, p_status
  )
  RETURNING participants.id, participants.registration_id INTO new_id, new_reg;
  RETURN QUERY SELECT new_id, new_reg;
END;
$$;
GRANT EXECUTE ON FUNCTION public.register_participant(uuid,uuid,uuid,text,text,text,text,text,text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_registration(p_registration_id text)
RETURNS TABLE (
  full_name text, function text, company text, profile_label text,
  profile_color text, registration_id text, status text,
  qr_payload text, badge_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.full_name, p.function, p.company, pt.label, pt.color_code,
         p.registration_id, p.status, b.qr_payload, b.badge_url
  FROM public.participants p
  LEFT JOIN public.profile_types pt ON pt.id = p.profile_type_id
  LEFT JOIN public.badges b ON b.participant_id = p.id
  WHERE p.registration_id = p_registration_id
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_registration(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_delegation_names(p_event_id uuid)
RETURNS TABLE (id uuid, primary_contact_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id, d.primary_contact_name FROM public.delegations d
  WHERE d.event_id = p_event_id ORDER BY d.primary_contact_name;
$$;
GRANT EXECUTE ON FUNCTION public.list_delegation_names(uuid) TO anon, authenticated;

-- 5. Lock down PII: anonymous visitors lose direct table access
DROP POLICY IF EXISTS "participants readable" ON public.participants;
DROP POLICY IF EXISTS "participants insertable" ON public.participants;
DROP POLICY IF EXISTS "payments readable" ON public.payments;
DROP POLICY IF EXISTS "badges readable" ON public.badges;
DROP POLICY IF EXISTS "badges insertable" ON public.badges;
DROP POLICY IF EXISTS "delegations readable" ON public.delegations;
DROP POLICY IF EXISTS "delegations insertable" ON public.delegations;

REVOKE ALL ON public.participants, public.badges, public.delegations FROM anon;
REVOKE ALL ON public.payments FROM anon;
GRANT INSERT ON public.payments TO anon;
GRANT SELECT, INSERT, UPDATE ON public.participants, public.badges, public.delegations, public.payments TO authenticated;

CREATE POLICY "staff read participants" ON public.participants
  FOR SELECT TO authenticated USING (public.is_approved_staff(auth.uid()));
CREATE POLICY "staff update participants" ON public.participants
  FOR UPDATE TO authenticated USING (public.is_approved_staff(auth.uid()))
  WITH CHECK (public.is_approved_staff(auth.uid()));
CREATE POLICY "staff read badges" ON public.badges
  FOR SELECT TO authenticated USING (public.is_approved_staff(auth.uid()));
CREATE POLICY "staff manage delegations" ON public.delegations
  FOR ALL TO authenticated USING (public.is_approved_staff(auth.uid()))
  WITH CHECK (public.is_approved_staff(auth.uid()));
CREATE POLICY "staff read payments" ON public.payments
  FOR SELECT TO authenticated USING (public.is_approved_staff(auth.uid()));
