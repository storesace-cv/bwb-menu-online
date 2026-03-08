-- Modelos de apresentação de artigos: tabela global, colunas em secções/categorias, propagação secção→categoria.

CREATE TABLE IF NOT EXISTS public.menu_presentation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  component_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_presentation_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS menu_presentation_templates_select_authenticated ON public.menu_presentation_templates;
CREATE POLICY menu_presentation_templates_select_authenticated ON public.menu_presentation_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS menu_presentation_templates_insert_superadmin ON public.menu_presentation_templates;
CREATE POLICY menu_presentation_templates_insert_superadmin ON public.menu_presentation_templates
  FOR INSERT TO authenticated WITH CHECK (public.current_user_is_superadmin());

DROP POLICY IF EXISTS menu_presentation_templates_update_superadmin ON public.menu_presentation_templates;
CREATE POLICY menu_presentation_templates_update_superadmin ON public.menu_presentation_templates
  FOR UPDATE TO authenticated USING (public.current_user_is_superadmin()) WITH CHECK (public.current_user_is_superadmin());

DROP POLICY IF EXISTS menu_presentation_templates_delete_superadmin ON public.menu_presentation_templates;
CREATE POLICY menu_presentation_templates_delete_superadmin ON public.menu_presentation_templates
  FOR DELETE TO authenticated USING (public.current_user_is_superadmin());

INSERT INTO public.menu_presentation_templates (name, component_key)
VALUES ('Modelo Restaurante 1', 'modelo-restaurante-1')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.menu_sections
  ADD COLUMN IF NOT EXISTS presentation_template_id uuid REFERENCES public.menu_presentation_templates(id) ON DELETE SET NULL;

ALTER TABLE public.menu_categories
  ADD COLUMN IF NOT EXISTS presentation_template_id uuid REFERENCES public.menu_presentation_templates(id) ON DELETE SET NULL;

-- public_menu_by_hostname: add presentation_component_key to sections and categories (propagate section→category).
CREATE OR REPLACE FUNCTION public.public_menu_by_hostname(host text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_store_name text;
  v_source_type text;
  v_tenant_nif text;
  v_result jsonb;
BEGIN
  SELECT sd.store_id, s.name, s.source_type, t.nif
  INTO v_store_id, v_store_name, v_source_type, v_tenant_nif
  FROM store_domains sd
  JOIN stores s ON s.id = sd.store_id
  JOIN tenants t ON t.id = s.tenant_id
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
        jsonb_build_object(
          'id', ms.id,
          'name', ms.name,
          'sort_order', ms.sort_order,
          'presentation_component_key', COALESCE(pt.component_key, 'modelo-restaurante-1')
        )
        ORDER BY ms.sort_order
      ), '[]'::jsonb)
      FROM menu_sections ms
      LEFT JOIN menu_presentation_templates pt ON pt.id = ms.presentation_template_id
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
          'presentation_component_key', COALESCE(
            (SELECT pt.component_key FROM menu_presentation_templates pt WHERE pt.id = mc.presentation_template_id),
            (SELECT pt.component_key FROM menu_sections ms JOIN menu_presentation_templates pt ON pt.id = ms.presentation_template_id WHERE ms.id = mc.section_id),
            'modelo-restaurante-1'
          ),
          'items', (
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', mi.id,
                'menu_name', COALESCE(mi.menu_name, ci.name_original),
                'menu_description', mi.menu_description,
                'menu_price', COALESCE(mi.menu_price, pr.resolved_price),
                'image_path', mi.image_path,
                'image_url', mi.image_url,
                'image_base_path', mi.image_base_path,
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
            LEFT JOIN catalog_items ci ON ci.id = mi.catalog_item_id
            LEFT JOIN LATERAL (
              SELECT
                CASE
                  WHEN v_source_type = 'excel_netbo' AND ci.id IS NOT NULL THEN (
                    SELECT CASE ifm.source_field
                      WHEN 'PVP1' THEN (NULLIF(trim(e.pvp1), '')::numeric)
                      WHEN 'PVP2' THEN (NULLIF(trim(e.pvp2), '')::numeric)
                      WHEN 'PVP3' THEN (NULLIF(trim(e.pvp3), '')::numeric)
                      WHEN 'PVP4' THEN (NULLIF(trim(e.pvp4), '')::numeric)
                      WHEN 'PVP5' THEN (NULLIF(trim(e.pvp5), '')::numeric)
                      ELSE NULL
                    END
                    FROM excel_netbo_imports e
                    CROSS JOIN import_field_mappings ifm
                    WHERE e.tenant_nif = v_tenant_nif AND e.store_id = v_store_id AND e.codigo = ci.external_id AND e.is_discontinued = false
                      AND ifm.source_type = 'excel_netbo' AND ifm.target_field = 'catalog_items.price_original' AND ifm.is_active
                    LIMIT 1
                  )
                  WHEN v_source_type = 'excel_zsbms' AND ci.id IS NOT NULL THEN (
                    SELECT CASE ifm.source_field
                      WHEN 'PVP1' THEN (NULLIF(trim(e.pvp1), '')::numeric)
                      WHEN 'PVP2' THEN (NULLIF(trim(e.pvp2), '')::numeric)
                      WHEN 'PVP3' THEN (NULLIF(trim(e.pvp3), '')::numeric)
                      WHEN 'PVP4' THEN (NULLIF(trim(e.pvp4), '')::numeric)
                      WHEN 'PVP5' THEN (NULLIF(trim(e.pvp5), '')::numeric)
                      ELSE NULL
                    END
                    FROM excel_zsbms_imports e
                    CROSS JOIN import_field_mappings ifm
                    WHERE e.tenant_nif = v_tenant_nif AND e.store_id = v_store_id AND e.codigo = ci.external_id AND e.is_discontinued = false
                      AND ifm.source_type = 'excel_zsbms' AND ifm.target_field = 'catalog_items.price_original' AND ifm.is_active
                    LIMIT 1
                  )
                  ELSE NULL
                END AS resolved_price
            ) pr ON true
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
