-- Include deleted_at in admin_list_users for UI (Gerir: Apagar vs Recuperar).

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
        'deleted_at', p.deleted_at,
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
