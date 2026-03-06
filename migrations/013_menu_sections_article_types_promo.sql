-- Menu sections (above category), article types with icon, promotion/take-away/ingredients on items.
-- Hierarchy: Store -> Sections (optional) -> Categories -> Items.

-- Sections per store
CREATE TABLE IF NOT EXISTS menu_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_sections_store_id ON menu_sections(store_id);

ALTER TABLE menu_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_menu_sections ON public.menu_sections;
DROP POLICY IF EXISTS tenant_insert_menu_sections ON public.menu_sections;
DROP POLICY IF EXISTS tenant_update_menu_sections ON public.menu_sections;
DROP POLICY IF EXISTS tenant_delete_menu_sections ON public.menu_sections;
CREATE POLICY tenant_select_menu_sections ON public.menu_sections FOR SELECT TO authenticated
  USING (public.user_has_store_access(store_id));
CREATE POLICY tenant_insert_menu_sections ON public.menu_sections FOR INSERT TO authenticated
  WITH CHECK (public.user_has_store_access(store_id));
CREATE POLICY tenant_update_menu_sections ON public.menu_sections FOR UPDATE TO authenticated
  USING (public.user_has_store_access(store_id));
CREATE POLICY tenant_delete_menu_sections ON public.menu_sections FOR DELETE TO authenticated
  USING (public.user_has_store_access(store_id));

-- Article types per store (icon_code: fish, beef, lobster, plant)
CREATE TABLE IF NOT EXISTS article_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon_code text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_types_store_id ON article_types(store_id);

ALTER TABLE article_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_article_types ON public.article_types;
DROP POLICY IF EXISTS tenant_insert_article_types ON public.article_types;
DROP POLICY IF EXISTS tenant_update_article_types ON public.article_types;
DROP POLICY IF EXISTS tenant_delete_article_types ON public.article_types;
CREATE POLICY tenant_select_article_types ON public.article_types FOR SELECT TO authenticated
  USING (public.user_has_store_access(store_id));
CREATE POLICY tenant_insert_article_types ON public.article_types FOR INSERT TO authenticated
  WITH CHECK (public.user_has_store_access(store_id));
CREATE POLICY tenant_update_article_types ON public.article_types FOR UPDATE TO authenticated
  USING (public.user_has_store_access(store_id));
CREATE POLICY tenant_delete_article_types ON public.article_types FOR DELETE TO authenticated
  USING (public.user_has_store_access(store_id));

-- Category belongs optionally to a section
ALTER TABLE public.menu_categories ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES menu_sections(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_menu_categories_section_id ON menu_categories(section_id);

-- Item: article type, promotion, price_old, take_away, ingredients
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS article_type_id uuid REFERENCES article_types(id) ON DELETE SET NULL;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_promotion boolean NOT NULL DEFAULT false;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS price_old numeric(12,4);
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS take_away boolean NOT NULL DEFAULT false;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS menu_ingredients text;
CREATE INDEX IF NOT EXISTS idx_menu_items_article_type_id ON menu_items(article_type_id);

-- Public menu RPC: return store_id, store_name, sections, categories (with section_id/section_name), items with article_type, is_promotion, price_old, take_away, menu_ingredients
CREATE OR REPLACE FUNCTION public_menu_by_hostname(host text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_store_name text;
  v_result jsonb;
BEGIN
  SELECT sd.store_id, s.name INTO v_store_id, v_store_name
  FROM store_domains sd
  JOIN stores s ON s.id = sd.store_id
  WHERE lower(sd.hostname) = lower(trim(host))
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RETURN jsonb_build_object('store_id', null, 'store_name', null, 'sections', '[]'::jsonb, 'categories', '[]'::jsonb, 'error', 'store not found');
  END IF;

  SELECT jsonb_build_object(
    'store_id', v_store_id,
    'store_name', COALESCE(v_store_name, ''),
    'store_settings', COALESCE((SELECT ss.settings FROM store_settings ss WHERE ss.store_id = v_store_id LIMIT 1), '{}'::jsonb),
    'sections', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('id', ms.id, 'name', ms.name, 'sort_order', ms.sort_order)
        ORDER BY ms.sort_order
      ), '[]'::jsonb)
      FROM menu_sections ms
      WHERE ms.store_id = v_store_id AND ms.is_visible = true
    ),
    'categories', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', mc.id,
          'name', mc.name,
          'description', mc.description,
          'sort_order', mc.sort_order,
          'section_id', mc.section_id,
          'section_name', (SELECT ms.name FROM menu_sections ms WHERE ms.id = mc.section_id),
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
                'is_promotion', COALESCE(mi.is_promotion, false),
                'price_old', mi.price_old,
                'take_away', COALESCE(mi.take_away, false),
                'menu_ingredients', mi.menu_ingredients,
                'article_type', CASE
                  WHEN at.id IS NOT NULL THEN jsonb_build_object('id', at.id, 'name', at.name, 'icon_code', at.icon_code)
                  ELSE null
                END,
                'allergens', (
                  SELECT COALESCE(jsonb_agg(jsonb_build_object('code', al.code, 'name', al.name) ORDER BY al.code), '[]'::jsonb)
                  FROM menu_item_allergens mia
                  JOIN allergens al ON al.id = mia.allergen_id
                  WHERE mia.menu_item_id = mi.id
                )
              ) ORDER BY mci.sort_order, mi.sort_order
            ), '[]'::jsonb)
            FROM menu_category_items mci
            JOIN menu_items mi ON mi.id = mci.menu_item_id AND mi.store_id = v_store_id AND mi.is_visible = true
            LEFT JOIN article_types at ON at.id = mi.article_type_id
            WHERE mci.category_id = mc.id
          )
        ) ORDER BY COALESCE((SELECT ms.sort_order FROM menu_sections ms WHERE ms.id = mc.section_id), 999999), mc.sort_order
      ), '[]'::jsonb)
      FROM menu_categories mc
      WHERE mc.store_id = v_store_id AND mc.is_visible = true
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
