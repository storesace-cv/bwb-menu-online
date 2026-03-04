-- Admin: list users (profiles + bindings) and assign role. Superadmin only.

CREATE OR REPLACE FUNCTION public.admin_list_users()
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
    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'email', p.email,
        'created_at', p.created_at,
        'bindings', (
          SELECT coalesce(jsonb_agg(jsonb_build_object(
            'role_code', urb.role_code,
            'tenant_id', urb.tenant_id,
            'tenant_name', t.name,
            'store_id', urb.store_id,
            'store_name', s.name
          ) ORDER BY urb.role_code), '[]'::jsonb)
          FROM public.user_role_bindings urb
          LEFT JOIN public.tenants t ON t.id = urb.tenant_id
          LEFT JOIN public.stores s ON s.id = urb.store_id
          WHERE urb.user_id = p.id
        )
      )
      ORDER BY p.email
    ), '[]'::jsonb)
    FROM public.profiles p
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_role(
  p_user_id uuid,
  p_role_code text,
  p_tenant_id uuid DEFAULT NULL,
  p_store_id uuid DEFAULT NULL
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
  INSERT INTO public.user_role_bindings (user_id, role_code, tenant_id, store_id)
  VALUES (p_user_id, p_role_code, p_tenant_id, p_store_id)
  ON CONFLICT (user_id, role_code, tenant_id, store_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_assign_role(uuid, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_role(uuid, text, uuid, uuid) TO service_role;
