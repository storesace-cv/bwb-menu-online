-- Add image_url to menu_items (external URL; image_path remains for Supabase Storage).
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS image_url text;

-- Update public_menu_by_hostname to return image_url (and keep image_path).
CREATE OR REPLACE FUNCTION public_menu_by_hostname(host text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_result jsonb;
BEGIN
  SELECT store_id INTO v_store_id
  FROM store_domains
  WHERE lower(hostname) = lower(trim(host))
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RETURN jsonb_build_object('store_id', null, 'categories', '[]'::jsonb, 'error', 'store not found');
  END IF;

  SELECT jsonb_build_object(
    'store_id', v_store_id,
    'categories', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', mc.id,
          'name', mc.name,
          'description', mc.description,
          'sort_order', mc.sort_order,
          'items', (
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', mi.id,
                'menu_name', mi.menu_name,
                'menu_description', mi.menu_description,
                'menu_price', mi.menu_price,
                'image_path', mi.image_path,
                'image_url', mi.image_url,
                'is_featured', mi.is_featured,
                'prep_minutes', mi.prep_minutes,
                'sort_order', mci.sort_order,
                'allergens', (
                  SELECT COALESCE(jsonb_agg(jsonb_build_object('code', a.code, 'name', a.name) ORDER BY a.code), '[]'::jsonb)
                  FROM menu_item_allergens mia
                  JOIN allergens a ON a.id = mia.allergen_id
                  WHERE mia.menu_item_id = mi.id
                )
              ) ORDER BY mci.sort_order, mi.sort_order
            ), '[]'::jsonb)
            FROM menu_category_items mci
            JOIN menu_items mi ON mi.id = mci.menu_item_id AND mi.store_id = v_store_id AND mi.is_visible = true
            WHERE mci.category_id = mc.id
          )
        ) ORDER BY mc.sort_order
      ), '[]'::jsonb)
      FROM menu_categories mc
      WHERE mc.store_id = v_store_id AND mc.is_visible = true
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
