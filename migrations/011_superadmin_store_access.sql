-- Superadmin can access all stores (menu_categories, menu_items, etc.) for portal-admin.
-- user_has_store_access returns true when current user is superadmin.
CREATE OR REPLACE FUNCTION public.user_has_store_access(p_store_id uuid)
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
  SELECT tenant_id INTO v_tenant_id FROM public.stores WHERE id = p_store_id LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_role_bindings urb
    WHERE urb.user_id = auth.uid()
      AND (
        (urb.role_code = 'tenant_admin' AND urb.tenant_id = v_tenant_id AND urb.store_id IS NULL)
        OR (urb.store_id = p_store_id)
      )
  );
END;
$$;
