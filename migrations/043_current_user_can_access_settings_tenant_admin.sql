-- current_user_can_access_settings: alargar para tenant_admin do tenant dono da loja.
-- Assim tenant_admin vê o link Definições e acede a Secções, Categorias, Gestão de Artigos, etc.

CREATE OR REPLACE FUNCTION public.current_user_can_access_settings(p_store_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
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
  -- store_admin para esta loja
  IF EXISTS (
    SELECT 1 FROM public.user_role_bindings urb
    WHERE urb.user_id = auth.uid()
      AND urb.role_code = 'store_admin'
      AND urb.store_id = p_store_id
  ) THEN
    RETURN true;
  END IF;
  -- tenant_admin do tenant dono da loja
  SELECT tenant_id INTO v_tenant_id FROM public.stores WHERE id = p_store_id LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_role_bindings urb
    WHERE urb.user_id = auth.uid()
      AND urb.role_code = 'tenant_admin'
      AND urb.tenant_id = v_tenant_id
      AND urb.store_id IS NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_can_access_settings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_can_access_settings(uuid) TO service_role;
