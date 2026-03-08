-- Tenant contact_email: obrigatório na criação (app); usado para enviar email na primeira loja.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS contact_email text;

-- admin_create_tenant: passa a aceitar p_contact_email (trim/lower; NULL permitido para migração).
CREATE OR REPLACE FUNCTION public.admin_create_tenant(p_nif text, p_name text, p_contact_email text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_email text := nullif(trim(lower(coalesce(p_contact_email, ''))), '');
BEGIN
  IF NOT public.current_user_is_superadmin() THEN
    RAISE EXCEPTION 'Forbidden: superadmin required';
  END IF;
  INSERT INTO public.tenants (nif, name, contact_email)
  VALUES (trim(lower(p_nif)), nullif(trim(p_name), ''), v_email)
  ON CONFLICT (nif) DO UPDATE SET
    name = EXCLUDED.name,
    contact_email = EXCLUDED.contact_email
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- admin_update_tenant: superadmin pode atualizar name e/ou contact_email (apenas campos não NULL são atualizados).
CREATE OR REPLACE FUNCTION public.admin_update_tenant(
  p_tenant_id uuid,
  p_name text DEFAULT NULL,
  p_contact_email text DEFAULT NULL
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
    contact_email = CASE WHEN p_contact_email IS NOT NULL THEN nullif(trim(lower(p_contact_email)), '') ELSE contact_email END
  WHERE id = p_tenant_id;
END;
$$;

-- admin_list_tenants: incluir contact_email no resultado.
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

GRANT EXECUTE ON FUNCTION public.admin_update_tenant(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_tenant(uuid, text, text) TO service_role;
