-- Resolve store by hostname (for tenant portal). SECURITY DEFINER to read store_domains.
CREATE OR REPLACE FUNCTION public.get_store_id_by_hostname(p_hostname text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
BEGIN
  SELECT store_id INTO v_store_id
  FROM public.store_domains
  WHERE lower(trim(hostname)) = lower(trim(p_hostname))
  LIMIT 1;
  RETURN v_store_id;
END;
$$;

-- True if current user has tenant_admin (for this store's tenant) or store_editor/viewer (for this store).
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

GRANT EXECUTE ON FUNCTION public.get_store_id_by_hostname(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_store_access(uuid) TO authenticated;

-- RLS policies: allow authenticated users with store access to read/write menu data for that store.
DROP POLICY IF EXISTS tenant_select_menu_categories ON public.menu_categories;
DROP POLICY IF EXISTS tenant_insert_menu_categories ON public.menu_categories;
DROP POLICY IF EXISTS tenant_update_menu_categories ON public.menu_categories;
DROP POLICY IF EXISTS tenant_delete_menu_categories ON public.menu_categories;
CREATE POLICY tenant_select_menu_categories ON public.menu_categories FOR SELECT TO authenticated
  USING (public.user_has_store_access(store_id));
CREATE POLICY tenant_insert_menu_categories ON public.menu_categories FOR INSERT TO authenticated
  WITH CHECK (public.user_has_store_access(store_id));
CREATE POLICY tenant_update_menu_categories ON public.menu_categories FOR UPDATE TO authenticated
  USING (public.user_has_store_access(store_id));
CREATE POLICY tenant_delete_menu_categories ON public.menu_categories FOR DELETE TO authenticated
  USING (public.user_has_store_access(store_id));

DROP POLICY IF EXISTS tenant_select_menu_items ON public.menu_items;
DROP POLICY IF EXISTS tenant_insert_menu_items ON public.menu_items;
DROP POLICY IF EXISTS tenant_update_menu_items ON public.menu_items;
DROP POLICY IF EXISTS tenant_delete_menu_items ON public.menu_items;
CREATE POLICY tenant_select_menu_items ON public.menu_items FOR SELECT TO authenticated
  USING (public.user_has_store_access(store_id));
CREATE POLICY tenant_insert_menu_items ON public.menu_items FOR INSERT TO authenticated
  WITH CHECK (public.user_has_store_access(store_id));
CREATE POLICY tenant_update_menu_items ON public.menu_items FOR UPDATE TO authenticated
  USING (public.user_has_store_access(store_id));
CREATE POLICY tenant_delete_menu_items ON public.menu_items FOR DELETE TO authenticated
  USING (public.user_has_store_access(store_id));

DROP POLICY IF EXISTS tenant_select_menu_category_items ON public.menu_category_items;
DROP POLICY IF EXISTS tenant_insert_menu_category_items ON public.menu_category_items;
DROP POLICY IF EXISTS tenant_update_menu_category_items ON public.menu_category_items;
DROP POLICY IF EXISTS tenant_delete_menu_category_items ON public.menu_category_items;
CREATE POLICY tenant_select_menu_category_items ON public.menu_category_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.menu_categories mc WHERE mc.id = category_id AND public.user_has_store_access(mc.store_id)));
CREATE POLICY tenant_insert_menu_category_items ON public.menu_category_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.menu_categories mc WHERE mc.id = category_id AND public.user_has_store_access(mc.store_id))
    AND EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.id = menu_item_id AND public.user_has_store_access(mi.store_id))
  );
CREATE POLICY tenant_update_menu_category_items ON public.menu_category_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.menu_categories mc WHERE mc.id = category_id AND public.user_has_store_access(mc.store_id)));
CREATE POLICY tenant_delete_menu_category_items ON public.menu_category_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.menu_categories mc WHERE mc.id = category_id AND public.user_has_store_access(mc.store_id)));
