-- Tenant: modo de fotos (image_source), origem dos dados (source_type), activar/desactivar (is_active).

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS image_source text NOT NULL DEFAULT 'storage'
    CHECK (image_source IN ('storage', 'url', 'legacy_path')),
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'netbo_api'
    CHECK (source_type IN (
      'netbo', 'storesace', 'demo', 'manual',
      'excel_zsbms', 'excel_netbo', 'excel_storesace', 'netbo_api', 'storesace_api'
    )),
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- admin_create_tenant: aceitar p_source_type (default netbo_api).
CREATE OR REPLACE FUNCTION public.admin_create_tenant(
  p_nif text,
  p_name text,
  p_contact_email text DEFAULT NULL,
  p_source_type text DEFAULT 'netbo_api'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_email text := nullif(trim(lower(coalesce(p_contact_email, ''))), '');
  v_src text := coalesce(nullif(trim(p_source_type), ''), 'netbo_api');
BEGIN
  IF NOT public.current_user_is_superadmin() THEN
    RAISE EXCEPTION 'Forbidden: superadmin required';
  END IF;
  IF v_src NOT IN ('netbo', 'storesace', 'demo', 'manual', 'excel_zsbms', 'excel_netbo', 'excel_storesace', 'netbo_api', 'storesace_api') THEN
    v_src := 'netbo_api';
  END IF;
  INSERT INTO public.tenants (nif, name, contact_email, source_type)
  VALUES (trim(lower(p_nif)), nullif(trim(p_name), ''), v_email, v_src)
  ON CONFLICT (nif) DO UPDATE SET
    name = EXCLUDED.name,
    contact_email = EXCLUDED.contact_email,
    source_type = EXCLUDED.source_type
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- admin_update_tenant: aceitar p_image_source, p_source_type, p_is_active (apenas os não NULL são atualizados).
CREATE OR REPLACE FUNCTION public.admin_update_tenant(
  p_tenant_id uuid,
  p_name text DEFAULT NULL,
  p_contact_email text DEFAULT NULL,
  p_image_source text DEFAULT NULL,
  p_source_type text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
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
  UPDATE public.tenants
  SET
    name = CASE WHEN p_name IS NOT NULL THEN nullif(trim(p_name), '') ELSE name END,
    contact_email = CASE WHEN p_contact_email IS NOT NULL THEN nullif(trim(lower(p_contact_email)), '') ELSE contact_email END,
    image_source = CASE
      WHEN p_image_source IS NOT NULL AND p_image_source IN ('storage', 'url', 'legacy_path') THEN p_image_source
      ELSE image_source
    END,
    source_type = CASE
      WHEN p_source_type IS NOT NULL AND p_source_type IN ('netbo', 'storesace', 'demo', 'manual', 'excel_zsbms', 'excel_netbo', 'excel_storesace', 'netbo_api', 'storesace_api') THEN p_source_type
      ELSE source_type
    END,
    is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_tenant_id;
END;
$$;

-- admin_list_tenants: incluir image_source, source_type, is_active.
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
          'image_source', image_source,
          'source_type', source_type,
          'is_active', is_active,
          'created_at', created_at
        ) ORDER BY name
      ),
      '[]'::jsonb
    )
    FROM public.tenants
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_tenant(uuid, text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_tenant(uuid, text, text, text, text, boolean) TO service_role;
