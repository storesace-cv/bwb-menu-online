-- Roles store_admin (Admin de Loja) e store_user (Utilizador de Loja).
-- RPC para guarda de acesso a Definições: apenas superadmin ou store_admin para a loja.

INSERT INTO public.roles (code, name) VALUES
  ('store_admin', 'Admin de Loja'),
  ('store_user', 'Utilizador de Loja')
ON CONFLICT (code) DO NOTHING;

-- True se o utilizador actual pode aceder a Definições da loja p_store_id.
-- Superadmin: sempre. Caso contrário: tem binding role_code='store_admin' e store_id=p_store_id.
CREATE OR REPLACE FUNCTION public.current_user_can_access_settings(p_store_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  IF public.current_user_is_superadmin() THEN
    RETURN true;
  END IF;
  IF p_store_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_role_bindings urb
    WHERE urb.user_id = auth.uid()
      AND urb.role_code = 'store_admin'
      AND urb.store_id = p_store_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_can_access_settings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_can_access_settings(uuid) TO service_role;

-- List users with role_code for a given store (for store_user list). Caller must be superadmin or store_admin for that store.
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

GRANT EXECUTE ON FUNCTION public.admin_list_users_by_role_for_store(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users_by_role_for_store(text, uuid) TO service_role;
