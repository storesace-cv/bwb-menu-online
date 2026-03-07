-- RPC to clear all menu-related data for a store (sections, categories, items, article types, links).
-- Only superadmin. Deletes in FK order.

CREATE OR REPLACE FUNCTION public.admin_clear_store_menu(p_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_superadmin() THEN
    RAISE EXCEPTION 'Forbidden: superadmin required';
  END IF;

  DELETE FROM public.menu_category_items
  WHERE menu_item_id IN (SELECT id FROM public.menu_items WHERE store_id = p_store_id);

  DELETE FROM public.menu_item_allergens
  WHERE menu_item_id IN (SELECT id FROM public.menu_items WHERE store_id = p_store_id);

  DELETE FROM public.menu_items WHERE store_id = p_store_id;
  DELETE FROM public.menu_categories WHERE store_id = p_store_id;
  DELETE FROM public.menu_sections WHERE store_id = p_store_id;
  DELETE FROM public.article_types WHERE store_id = p_store_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_clear_store_menu(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_clear_store_menu(uuid) TO service_role;
