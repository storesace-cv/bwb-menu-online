-- RPC: list all stores with tenant_nif and primary hostname for Excel import UI (superadmin).

CREATE OR REPLACE FUNCTION public.admin_list_stores_for_import()
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
          'tenant_nif', t.nif,
          'store_id', s.id,
          'store_number', s.store_number,
          'store_name', s.name,
          'source_type', s.source_type,
          'hostname', (
            SELECT sd.hostname
            FROM public.store_domains sd
            WHERE sd.store_id = s.id AND sd.is_primary = true
            LIMIT 1
          )
        ) ORDER BY t.nif, s.store_number
      ),
      '[]'::jsonb
    )
    FROM public.stores s
    JOIN public.tenants t ON t.id = s.tenant_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_stores_for_import() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_stores_for_import() TO service_role;
