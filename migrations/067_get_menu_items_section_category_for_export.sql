-- Export Excel: section and category per menu item. One row per item; "—" when no category.
-- Caller must have store access.
CREATE OR REPLACE FUNCTION public.get_menu_items_section_category_for_export(p_store_id uuid)
RETURNS TABLE(menu_item_id uuid, section_name text, category_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_has_store_access(p_store_id) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT mi.id AS menu_item_id,
    COALESCE(ms.name, '—')::text AS section_name,
    COALESCE(mc.name, '—')::text AS category_name
  FROM menu_items mi
  LEFT JOIN LATERAL (
    SELECT mci.category_id
    FROM menu_category_items mci
    JOIN menu_categories mc ON mc.id = mci.category_id AND mc.store_id = mi.store_id
    LEFT JOIN menu_sections ms ON ms.id = mc.section_id
    WHERE mci.menu_item_id = mi.id
    ORDER BY COALESCE(ms.sort_order, 999999), mc.sort_order
    LIMIT 1
  ) first_cat ON true
  LEFT JOIN menu_categories mc ON mc.id = first_cat.category_id
  LEFT JOIN menu_sections ms ON ms.id = mc.section_id
  WHERE mi.store_id = p_store_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_menu_items_section_category_for_export(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_menu_items_section_category_for_export(uuid) TO service_role;
