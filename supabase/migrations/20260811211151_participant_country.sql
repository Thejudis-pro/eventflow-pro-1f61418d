-- Registration form now collects Nom/Prénom (combined into full_name by the
-- client) and Pays. Adds the missing column and re-publishes
-- register_participant with a new p_country parameter, appended at the end
-- so the existing (event_id, profile_type_id, delegation_id text, ...) shape
-- from 20260811154717 is untouched for any other caller.
ALTER TABLE public.participants ADD COLUMN country text;

DROP FUNCTION IF EXISTS public.register_participant(uuid,uuid,text,text,text,text,text,text,text,text);

CREATE OR REPLACE FUNCTION public.register_participant(
  p_event_id uuid, p_profile_type_id uuid, p_delegation_id text,
  p_full_name text, p_email text, p_phone text,
  p_company text, p_function text, p_sector text, p_status text,
  p_country text
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
    company, function, sector, status, country
  ) VALUES (
    p_event_id, p_profile_type_id, nullif(trim(coalesce(p_delegation_id,'')),'')::uuid,
    trim(p_full_name), lower(trim(p_email)),
    nullif(trim(coalesce(p_phone,'')),''),
    nullif(trim(coalesce(p_company,'')),''),
    nullif(trim(coalesce(p_function,'')),''),
    nullif(trim(coalesce(p_sector,'')),''),
    p_status,
    nullif(trim(coalesce(p_country,'')),'')
  )
  RETURNING participants.id, participants.registration_id INTO new_id, new_reg;
  RETURN QUERY SELECT new_id, new_reg;
END;
$$;
GRANT EXECUTE ON FUNCTION public.register_participant(uuid,uuid,text,text,text,text,text,text,text,text,text) TO anon, authenticated;
