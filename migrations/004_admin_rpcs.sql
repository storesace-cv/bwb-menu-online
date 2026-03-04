-- Admin RPCs (SECURITY DEFINER). Callable only by users with superadmin binding.
-- Verificação: auth.uid() must have user_role_bindings (superadmin, NULL, NULL).

CREATE OR REPLACE FUNCTION public.current_user_is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_role_bindings urb
    WHERE urb.user_id = auth.uid()
      AND urb.role_code = 'superadmin'
      AND urb.tenant_id IS NULL
      AND urb.store_id IS NULL
  ) THEN
    RETURN true;
  END IF;
  v_claims := current_setting('request.jwt.claims', true)::jsonb;
  IF v_claims IS NOT NULL AND (v_claims->>'role') = 'service_role' THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_tenant(p_nif text, p_name text)
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
  INSERT INTO public.tenants (nif, name)
  VALUES (trim(lower(p_nif)), nullif(trim(p_name), ''))
  ON CONFLICT (nif) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

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
  ON CONFLICT (tenant_id, store_number) DO UPDATE SET name = EXCLUDED.name, source_type = EXCLUDED.source_type
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_store_domain(
  p_store_id uuid,
  p_hostname text,
  p_domain_type text,
  p_is_primary boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_host text := lower(trim(p_hostname));
BEGIN
  IF NOT public.current_user_is_superadmin() THEN
    RAISE EXCEPTION 'Forbidden: superadmin required';
  END IF;
  INSERT INTO public.store_domains (store_id, hostname, domain_type, is_primary)
  VALUES (p_store_id, v_host, p_domain_type, coalesce(p_is_primary, true))
  ON CONFLICT (hostname) DO UPDATE SET store_id = EXCLUDED.store_id, domain_type = EXCLUDED.domain_type, is_primary = EXCLUDED.is_primary
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_integration_config(
  p_store_id uuid,
  p_source_type text,
  p_config jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_superadmin() THEN
    RAISE EXCEPTION 'Forbidden: superadmin required';
  END IF;
  INSERT INTO public.store_integrations (store_id, source_type, config)
  VALUES (p_store_id, p_source_type, p_config)
  ON CONFLICT (store_id) DO UPDATE SET source_type = EXCLUDED.source_type, config = EXCLUDED.config, updated_at = now();
END;
$$;

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
  RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'nif', nif, 'name', name, 'created_at', created_at) ORDER BY name), '[]'::jsonb) FROM public.tenants);
END;
$$;

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
  RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'tenant_id', tenant_id, 'store_number', store_number, 'name', name, 'source_type', source_type, 'is_active', is_active) ORDER BY store_number), '[]'::jsonb) FROM public.stores WHERE tenant_id = p_tenant_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_domains(p_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_superadmin() THEN
    RAISE EXCEPTION 'Forbidden: superadmin required';
  END IF;
  RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'store_id', store_id, 'hostname', hostname, 'domain_type', domain_type, 'is_primary', is_primary) ORDER BY hostname), '[]'::jsonb) FROM public.store_domains WHERE store_id = p_store_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_tenant(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_store(uuid, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_store_domain(uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_integration_config(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_tenants() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_stores(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_domains(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_superadmin() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_tenant(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_store(uuid, int, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_store_domain(uuid, text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_integration_config(uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_tenants() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_stores(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_domains(uuid) TO service_role;
