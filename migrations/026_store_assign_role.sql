-- Store admin (or superadmin) can assign store_user / store_admin for a store.

CREATE OR REPLACE FUNCTION public.store_assign_role(
  p_store_id uuid,
  p_user_id uuid,
  p_role_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT public.current_user_is_superadmin() AND NOT public.current_user_can_access_settings(p_store_id) THEN
    RAISE EXCEPTION 'Forbidden: superadmin or store_admin for this store required';
  END IF;
  IF p_role_code IS NULL OR p_role_code NOT IN ('store_user', 'store_admin') THEN
    RAISE EXCEPTION 'Invalid role_code: must be store_user or store_admin';
  END IF;

  SELECT s.tenant_id INTO v_tenant_id FROM public.stores s WHERE s.id = p_store_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Store not found';
  END IF;

  DELETE FROM public.user_role_bindings
  WHERE user_id = p_user_id
    AND store_id = p_store_id
    AND role_code IN ('store_user', 'store_admin');

  INSERT INTO public.user_role_bindings (user_id, role_code, tenant_id, store_id)
  VALUES (p_user_id, p_role_code, v_tenant_id, p_store_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.store_assign_role(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_assign_role(uuid, uuid, text) TO service_role;
