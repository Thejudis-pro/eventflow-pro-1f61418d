CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  location text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','closed','archived')),
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profile_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label text NOT NULL,
  color_code text NOT NULL DEFAULT '#2E7D32',
  requires_payment boolean NOT NULL DEFAULT false,
  price numeric(12,2),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  primary_contact_name text NOT NULL,
  email text,
  phone text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('csv_import','manual')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE public.participant_reg_seq START 1;

CREATE TABLE public.participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  profile_type_id uuid REFERENCES public.profile_types(id) ON DELETE SET NULL,
  delegation_id uuid REFERENCES public.delegations(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  sector text,
  function text,
  registration_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','confirmed','checked_in')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('paytech','paydunya')),
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  provider_transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  qr_payload text NOT NULL UNIQUE,
  badge_url text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  sent_email boolean NOT NULL DEFAULT false,
  sent_whatsapp boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_participants_event ON public.participants(event_id);
CREATE INDEX idx_profile_types_event ON public.profile_types(event_id);

CREATE OR REPLACE FUNCTION public.set_registration_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  ev_slug text;
BEGIN
  IF NEW.registration_id IS NULL OR NEW.registration_id = '' THEN
    SELECT upper(replace(slug, '-', '')) INTO ev_slug FROM public.events WHERE id = NEW.event_id;
    NEW.registration_id := 'REG-' || coalesce(ev_slug, 'EVENT') || '-' || lpad(nextval('public.participant_reg_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE public.participants ALTER COLUMN registration_id DROP NOT NULL;

CREATE TRIGGER trg_set_registration_id
BEFORE INSERT ON public.participants
FOR EACH ROW EXECUTE FUNCTION public.set_registration_id();

GRANT SELECT ON public.events TO anon, authenticated;
GRANT SELECT ON public.profile_types TO anon, authenticated;
GRANT SELECT, INSERT ON public.delegations TO anon, authenticated;
GRANT SELECT, INSERT ON public.participants TO anon, authenticated;
GRANT SELECT, INSERT ON public.payments TO anon, authenticated;
GRANT SELECT, INSERT ON public.badges TO anon, authenticated;
GRANT ALL ON public.events, public.profile_types, public.delegations, public.participants, public.payments, public.badges TO service_role;
GRANT USAGE ON SEQUENCE public.participant_reg_seq TO anon, authenticated, service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events readable" ON public.events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "profile_types readable" ON public.profile_types FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "delegations readable" ON public.delegations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "delegations insertable" ON public.delegations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "participants readable" ON public.participants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "participants insertable" ON public.participants FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "payments readable" ON public.payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "payments insertable" ON public.payments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "badges readable" ON public.badges FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "badges insertable" ON public.badges FOR INSERT TO anon, authenticated WITH CHECK (true);

INSERT INTO public.events (id, name, slug, start_date, end_date, location, status, branding) VALUES
('11111111-1111-1111-1111-111111111111', 'FESA 2026', 'fesa26', '2026-09-21', '2026-09-22', 'Dakar, Sénégal', 'live', '{"primary":"#2E7D32","accent":"#F57C00","organizer":"PAAF"}'::jsonb);

INSERT INTO public.profile_types (event_id, label, color_code, requires_payment, price, sort_order) VALUES
('11111111-1111-1111-1111-111111111111', 'VIP', '#C62828', false, NULL, 1),
('11111111-1111-1111-1111-111111111111', 'Entrepreneur', '#2E7D32', true, 10000, 2),
('11111111-1111-1111-1111-111111111111', 'Institution/Partenaire', '#1565C0', false, NULL, 3),
('11111111-1111-1111-1111-111111111111', 'Presse', '#6A1B9A', false, NULL, 4),
('11111111-1111-1111-1111-111111111111', 'Standard', '#F57C00', true, 10000, 5);