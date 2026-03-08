-- Ao apagar o menu da loja, limpar também os dados de importação Excel (import_runs, excel_netbo_imports, excel_zsbms_imports).

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

  DELETE FROM public.import_runs WHERE store_id = p_store_id;
  DELETE FROM public.excel_netbo_imports WHERE store_id = p_store_id;
  DELETE FROM public.excel_zsbms_imports WHERE store_id = p_store_id;

  UPDATE public.stores SET menu_cleared_at = now() WHERE id = p_store_id;
END;
$$;
