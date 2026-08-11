-- Phase 1: demo dataset so the dashboard isn't empty during the PAAF demo.
-- 50 participants spread across the 5 profile types with mixed statuses.
DO $$
DECLARE
  ev_id uuid := '11111111-1111-1111-1111-111111111111';
  vip_id uuid;
  entrepreneur_id uuid;
  institution_id uuid;
  presse_id uuid;
  standard_id uuid;
  first_names text[] := ARRAY['Awa','Moussa','Fatou','Ibrahima','Aissatou','Cheikh','Mariama','Ousmane','Khady','Abdoulaye','Ndeye','Mamadou','Bineta','Serigne','Coumba','Alioune','Ramatoulaye','Baba','Aminata','Modou'];
  last_names text[] := ARRAY['Diop','Ndiaye','Sow','Fall','Ba','Gueye','Diallo','Kane','Faye','Cisse','Sarr','Toure','Diaw','Thiam','Sy'];
  companies text[] := ARRAY['AgroSen SARL','Teranga Foods','Sahel Logistics','Dakar Microfinance','GreenValley Agro','Senegal Export','Baobab Capital','FemPreneur Hub','Ecowas Trade Co','Fatick Agro-Transformation','GIZ','Ministere de l''Agriculture','BOAD','PNUD','ONU Femmes','Chambre de Commerce de Dakar','ADEPME','Banque Atlantique','RTS','APS Senegal','Le Soleil','Jeune Afrique','Walf TV'];
  sectors text[] := ARRAY['Agro-transformation','Logistique','Commerce & Distribution','Agriculture & Elevage','Technologie & Digital','Finance & Microfinance','Artisanat','Autre'];
  functions text[] := ARRAY['Directrice Generale','Responsable Achats','Fondateur','Chargee de projet','Coordinateur','Cheffe d''entreprise','Analyste','Consultante','Directeur Financier','Responsable Communication'];
  i int;
  pid uuid;
  chosen_profile uuid;
  chosen_status text;
  fn text;
  ln text;
BEGIN
  SELECT id INTO vip_id FROM public.profile_types WHERE event_id = ev_id AND label = 'VIP';
  SELECT id INTO entrepreneur_id FROM public.profile_types WHERE event_id = ev_id AND label = 'Entrepreneur';
  SELECT id INTO institution_id FROM public.profile_types WHERE event_id = ev_id AND label = 'Institution/Partenaire';
  SELECT id INTO presse_id FROM public.profile_types WHERE event_id = ev_id AND label = 'Presse';
  SELECT id INTO standard_id FROM public.profile_types WHERE event_id = ev_id AND label = 'Standard';

  FOR i IN 1..50 LOOP
    fn := first_names[1 + (i % array_length(first_names, 1))];
    ln := last_names[1 + ((i * 3) % array_length(last_names, 1))];
    chosen_profile := CASE i % 5
      WHEN 0 THEN vip_id
      WHEN 1 THEN entrepreneur_id
      WHEN 2 THEN institution_id
      WHEN 3 THEN presse_id
      ELSE standard_id
    END;
    chosen_status := CASE
      WHEN i % 11 = 0 THEN 'pending'
      WHEN i % 7 = 0 THEN 'checked_in'
      WHEN chosen_profile IN (entrepreneur_id, standard_id) THEN 'paid'
      ELSE 'confirmed'
    END;

    INSERT INTO public.participants
      (event_id, profile_type_id, full_name, email, phone, company, sector, function, status, created_at)
    VALUES (
      ev_id,
      chosen_profile,
      fn || ' ' || ln,
      lower(fn || '.' || ln || i::text || '@example.com'),
      '+2217' || lpad((1000000 + i * 137)::text, 7, '0'),
      companies[1 + (i % array_length(companies, 1))],
      CASE WHEN chosen_profile = entrepreneur_id THEN sectors[1 + (i % array_length(sectors, 1))] ELSE NULL END,
      functions[1 + (i % array_length(functions, 1))],
      chosen_status,
      now() - ((50 - i) || ' hours')::interval
    )
    RETURNING id INTO pid;

    IF chosen_status = 'checked_in' THEN
      INSERT INTO public.checkins (participant_id, scanned_by) VALUES (pid, 'staff-demo');
    END IF;

    IF chosen_status = 'paid' THEN
      INSERT INTO public.payments (participant_id, provider, amount, status, provider_transaction_id)
      VALUES (
        pid,
        CASE WHEN i % 2 = 0 THEN 'paytech' ELSE 'paydunya' END,
        10000,
        'success',
        'DEMO-' || lpad(i::text, 6, '0')
      );
    END IF;
  END LOOP;
END $$;
