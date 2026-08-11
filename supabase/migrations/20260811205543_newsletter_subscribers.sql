-- Homepage footer newsletter signup ("Rester informé"). Public insert-only,
-- no read access from the client — staff can query it from the DB directly.
CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);

CREATE INDEX idx_newsletter_subscribers_event ON public.newsletter_subscribers(event_id);

GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "newsletter_subscribers insertable" ON public.newsletter_subscribers
  FOR INSERT TO anon, authenticated WITH CHECK (true);
