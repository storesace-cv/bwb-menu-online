-- Garantir que admin_list_tenants devolve contact_email (re-aplicar definição).
CREATE OR REPLACE FUNCTION public.admin_list_tenants()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_superadmin() THEN
    RAISE EXCEPTION 'Forbidden: superadmin required';
  END IF;
  RETURN (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'nif', nif,
          'name', name,
          'contact_email', contact_email,
          'created_at', created_at
        ) ORDER BY name
      ),
      '[]'::jsonb
    )
    FROM public.tenants
  );
END;
$$;
