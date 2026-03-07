-- Include domain_origin and custom_domain in admin_list_stores result.

CREATE OR REPLACE FUNCTION public.admin_list_stores(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_superadmin() THEN
    RAISE EXCEPTION 'Forbidden: superadmin required';
  END IF;
  RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'tenant_id', tenant_id,
    'store_number', store_number,
    'name', name,
    'source_type', source_type,
    'is_active', is_active,
    'domain_origin', domain_origin,
    'custom_domain', custom_domain
  ) ORDER BY store_number), '[]'::jsonb) FROM public.stores WHERE tenant_id = p_tenant_id);
END;
$$;
