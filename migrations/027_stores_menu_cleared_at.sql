-- Flag para não repovoar menu da loja no bootstrap demo quando o menu foi explicitamente apagado.

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS menu_cleared_at timestamptz;

COMMENT ON COLUMN public.stores.menu_cleared_at IS 'Set when admin_clear_store_menu runs; demo bootstrap skips menu repopulation for this store.';

-- Ao apagar o menu, marcar a loja para o bootstrap demo não repovoar.
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

  UPDATE public.stores SET menu_cleared_at = now() WHERE id = p_store_id;
END;
$$;
