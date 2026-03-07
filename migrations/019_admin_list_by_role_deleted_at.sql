-- Include deleted_at in admin_list_users_by_role_for_store for UI (Gerir: Apagar vs Recuperar).

CREATE OR REPLACE FUNCTION public.admin_list_users_by_role_for_store(p_role_code text, p_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT public.current_user_is_superadmin() AND NOT public.current_user_can_access_settings(p_store_id) THEN
    RAISE EXCEPTION 'Forbidden: superadmin or store_admin for this store required';
  END IF;
  RETURN (
    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'email', p.email,
        'created_at', p.created_at,
        'deleted_at', p.deleted_at,
        'store_id', urb.store_id,
        'store_name', s.name
      )
      ORDER BY p.email
    ), '[]'::jsonb)
    FROM public.profiles p
    INNER JOIN public.user_role_bindings urb ON urb.user_id = p.id AND urb.role_code = p_role_code AND urb.store_id = p_store_id
    LEFT JOIN public.stores s ON s.id = urb.store_id
  );
END;
$$;
