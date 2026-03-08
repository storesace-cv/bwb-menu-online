-- Returns familia and sub_familia from the store's import table (excel_netbo or excel_zsbms) per menu_item.
-- One row per menu_item; familia/sub_familia NULL when no matching import row. Caller must have store access.
CREATE OR REPLACE FUNCTION public.get_import_familia_for_store(p_store_id uuid)
RETURNS TABLE(menu_item_id uuid, familia text, sub_familia text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_type text;
  v_tenant_nif text;
BEGIN
  IF NOT public.user_has_store_access(p_store_id) THEN
    RETURN;
  END IF;

  SELECT s.source_type, t.nif INTO v_source_type, v_tenant_nif
  FROM stores s
  JOIN tenants t ON t.id = s.tenant_id
  WHERE s.id = p_store_id;

  IF v_source_type NOT IN ('excel_netbo', 'excel_zsbms') THEN
    RETURN;
  END IF;

  IF v_source_type = 'excel_netbo' THEN
    RETURN QUERY
    SELECT mi.id AS menu_item_id,
      e.familia,
      e.sub_familia
    FROM menu_items mi
    LEFT JOIN catalog_items ci ON ci.id = mi.catalog_item_id AND ci.store_id = mi.store_id
    LEFT JOIN excel_netbo_imports e ON e.tenant_nif = v_tenant_nif AND e.store_id = p_store_id
      AND e.codigo = COALESCE(mi.item_code, ci.external_id)
      AND e.is_discontinued = false
    WHERE mi.store_id = p_store_id;
  ELSIF v_source_type = 'excel_zsbms' THEN
    RETURN QUERY
    SELECT mi.id AS menu_item_id,
      e.familia,
      e.sub_familia
    FROM menu_items mi
    LEFT JOIN catalog_items ci ON ci.id = mi.catalog_item_id AND ci.store_id = mi.store_id
    LEFT JOIN excel_zsbms_imports e ON e.tenant_nif = v_tenant_nif AND e.store_id = p_store_id
      AND e.codigo = COALESCE(mi.item_code, ci.external_id)
      AND e.is_discontinued = false
    WHERE mi.store_id = p_store_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_import_familia_for_store(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_import_familia_for_store(uuid) TO service_role;
