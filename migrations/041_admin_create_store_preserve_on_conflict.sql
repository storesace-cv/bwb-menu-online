-- On conflict (tenant_id, store_number), do not overwrite name or source_type:
-- preserve admin changes made in the portal. Bootstrap scripts only ensure the store exists.

CREATE OR REPLACE FUNCTION public.admin_create_store(
  p_tenant_id uuid,
  p_store_number int,
  p_name text,
  p_source_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.current_user_is_superadmin() THEN
    RAISE EXCEPTION 'Forbidden: superadmin required';
  END IF;
  INSERT INTO public.stores (tenant_id, store_number, name, source_type)
  VALUES (p_tenant_id, p_store_number, nullif(trim(p_name), ''), p_source_type)
  ON CONFLICT (tenant_id, store_number) DO UPDATE SET created_at = stores.created_at
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
