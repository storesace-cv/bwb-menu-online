-- Propagate: set item_code when creating menu_items (from catalog_items.external_id).

CREATE OR REPLACE FUNCTION public.propagate_import_to_catalog_and_menu(
  p_store_id uuid,
  p_tenant_nif text,
  p_source_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_source_type NOT IN ('excel_netbo', 'excel_zsbms') THEN
    RAISE EXCEPTION 'source_type must be excel_netbo or excel_zsbms';
  END IF;

  IF p_source_type = 'excel_netbo' THEN
    INSERT INTO public.catalog_items (store_id, source_type, external_id, name_original, price_original)
    SELECT p_store_id, p_source_type, e.codigo, nullif(trim(e.produto), ''), NULL
    FROM public.excel_netbo_imports e
    WHERE e.tenant_nif = p_tenant_nif AND e.store_id = p_store_id AND e.is_discontinued = false
    ON CONFLICT (store_id, source_type, external_id) DO UPDATE SET
      name_original = COALESCE(nullif(trim(EXCLUDED.name_original), ''), catalog_items.name_original);

    INSERT INTO public.menu_items (store_id, catalog_item_id, menu_name, menu_price, is_visible, sort_order, item_code)
    SELECT p_store_id, c.id, c.name_original, NULL, true, 0, c.external_id
    FROM public.catalog_items c
    WHERE c.store_id = p_store_id AND c.source_type = p_source_type
      AND NOT EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.store_id = c.store_id AND mi.catalog_item_id = c.id);
  ELSIF p_source_type = 'excel_zsbms' THEN
    INSERT INTO public.catalog_items (store_id, source_type, external_id, name_original, price_original)
    SELECT p_store_id, p_source_type, e.codigo, nullif(trim(e.descricao), ''), NULL
    FROM public.excel_zsbms_imports e
    WHERE e.tenant_nif = p_tenant_nif AND e.store_id = p_store_id AND e.is_discontinued = false
    ON CONFLICT (store_id, source_type, external_id) DO UPDATE SET
      name_original = COALESCE(nullif(trim(EXCLUDED.name_original), ''), catalog_items.name_original);

    INSERT INTO public.menu_items (store_id, catalog_item_id, menu_name, menu_price, is_visible, sort_order, item_code)
    SELECT p_store_id, c.id, c.name_original, NULL, true, 0, c.external_id
    FROM public.catalog_items c
    WHERE c.store_id = p_store_id AND c.source_type = p_source_type
      AND NOT EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.store_id = c.store_id AND mi.catalog_item_id = c.id);
  END IF;
END;
$$;
