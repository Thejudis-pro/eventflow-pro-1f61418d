-- Staff could already read/update participants (20260811154642) but not
-- delete one -- needed for the admin "remove a participant" action.
-- Cascades to badges/payments/checkins via their existing FK constraints.
GRANT DELETE ON public.participants TO authenticated;

CREATE POLICY "staff delete participants" ON public.participants
  FOR DELETE TO authenticated USING (public.is_approved_staff(auth.uid()));
