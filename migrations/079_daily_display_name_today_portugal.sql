-- Nome do dia: usar "hoje" em timezone Portugal (Europe/Lisbon) para resolver daily_display_name.
-- Evita que servidor em UTC devolva NULL quando em Portugal ainda é o dia anterior.

CREATE OR REPLACE FUNCTION public.today_portugal()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (current_timestamp AT TIME ZONE 'Europe/Lisbon')::date;
$$;

DO $$
DECLARE
  fname text;
  fdef text;
  old_expr text := 'd.schedule_date = current_date';
  new_expr text := 'd.schedule_date = (current_timestamp AT TIME ZONE ''Europe/Lisbon'')::date';
BEGIN
  FOR fname IN SELECT unnest(ARRAY['public_menu_by_hostname', 'public_menu_initial_by_hostname', 'public_menu_section_categories_by_hostname'])
  LOOP
    SELECT pg_get_functiondef(p.oid)
      INTO fdef
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fname;
    IF fdef IS NOT NULL AND fdef LIKE '%' || old_expr || '%' THEN
      fdef := replace(fdef, old_expr, new_expr);
      EXECUTE fdef;
    END IF;
  END LOOP;
END;
$$;
