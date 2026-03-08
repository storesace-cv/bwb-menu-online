-- Alergénios EU14: multi-idioma (name_i18n), severity (1-5), seed 6 línguas, RLS, payload público.

-- 1.1 Evoluir tabela allergens
ALTER TABLE public.allergens
  ADD COLUMN IF NOT EXISTS severity smallint NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS name_i18n jsonb,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill name_i18n from name (existing rows from seed 002); safe when re-running (name already dropped)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'allergens' AND column_name = 'name') THEN
    UPDATE public.allergens SET name_i18n = jsonb_build_object('pt', COALESCE(name, ''));
    UPDATE public.allergens SET name_i18n = '{"pt":""}'::jsonb WHERE name_i18n IS NULL;
    ALTER TABLE public.allergens ALTER COLUMN name_i18n SET NOT NULL;
    ALTER TABLE public.allergens DROP COLUMN name;
  END IF;
END $$;

UPDATE public.allergens SET code = upper(code) WHERE code <> upper(code);

ALTER TABLE public.allergens DROP CONSTRAINT IF EXISTS allergens_severity_check;
ALTER TABLE public.allergens ADD CONSTRAINT allergens_severity_check CHECK (severity BETWEEN 1 AND 5);

-- 1.2 menu_item_allergens: ON DELETE RESTRICT + índices
ALTER TABLE public.menu_item_allergens
  DROP CONSTRAINT IF EXISTS menu_item_allergens_allergen_id_fkey;

ALTER TABLE public.menu_item_allergens
  ADD CONSTRAINT menu_item_allergens_allergen_id_fkey
  FOREIGN KEY (allergen_id) REFERENCES public.allergens(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_menu_item_allergens_menu_item_id ON public.menu_item_allergens(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_allergens_allergen_id ON public.menu_item_allergens(allergen_id);

-- 1.3 RLS
DROP POLICY IF EXISTS allergens_select_anon ON public.allergens;
CREATE POLICY allergens_select_anon ON public.allergens FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS allergens_select_authenticated ON public.allergens;
CREATE POLICY allergens_select_authenticated ON public.allergens FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS menu_item_allergens_select ON public.menu_item_allergens;
CREATE POLICY menu_item_allergens_select ON public.menu_item_allergens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.id = menu_item_allergens.menu_item_id AND public.user_has_store_access(mi.store_id)));

DROP POLICY IF EXISTS menu_item_allergens_insert ON public.menu_item_allergens;
CREATE POLICY menu_item_allergens_insert ON public.menu_item_allergens FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.id = menu_item_allergens.menu_item_id AND public.user_has_store_access(mi.store_id)));

DROP POLICY IF EXISTS menu_item_allergens_delete ON public.menu_item_allergens;
CREATE POLICY menu_item_allergens_delete ON public.menu_item_allergens FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.id = menu_item_allergens.menu_item_id AND public.user_has_store_access(mi.store_id)));

-- 1.4 Seed EU14 (6 idiomas: pt, en, de, fr, es, he)
INSERT INTO public.allergens (code, severity, name_i18n, sort_order, is_active, updated_at)
VALUES
  ('GLUTEN', 3, '{"pt":"Glúten","en":"Gluten","de":"Gluten","fr":"Gluten","es":"Gluten","he":"גלוטן"}', 1, true, now()),
  ('CRUSTACEANS', 4, '{"pt":"Crustáceos","en":"Crustaceans","de":"Krebstiere","fr":"Crustacés","es":"Crustáceos","he":"סרטנים"}', 2, true, now()),
  ('EGGS', 4, '{"pt":"Ovos","en":"Eggs","de":"Eier","fr":"Œufs","es":"Huevos","he":"ביצים"}', 3, true, now()),
  ('FISH', 3, '{"pt":"Peixe","en":"Fish","de":"Fisch","fr":"Poisson","es":"Pescado","he":"דגים"}', 4, true, now()),
  ('PEANUTS', 5, '{"pt":"Amendoins","en":"Peanuts","de":"Erdnüsse","fr":"Arachides","es":"Cacahuetes","he":"בוטנים"}', 5, true, now()),
  ('SOY', 3, '{"pt":"Soja","en":"Soy","de":"Soja","fr":"Soja","es":"Soja","he":"סויה"}', 6, true, now()),
  ('MILK', 4, '{"pt":"Leite","en":"Milk","de":"Milch","fr":"Lait","es":"Leche","he":"חלב"}', 7, true, now()),
  ('NUTS', 5, '{"pt":"Frutos de casca rija","en":"Tree nuts","de":"Schalenfrüchte","fr":"Fruits à coque","es":"Frutos de cáscara","he":"אגוזים"}', 8, true, now()),
  ('CELERY', 2, '{"pt":"Aipo","en":"Celery","de":"Sellerie","fr":"Céleri","es":"Apio","he":"סלרי"}', 9, true, now()),
  ('MUSTARD', 2, '{"pt":"Mostarda","en":"Mustard","de":"Senf","fr":"Moutarde","es":"Mostaza","he":"חרדל"}', 10, true, now()),
  ('SESAME', 2, '{"pt":"Sésamo","en":"Sesame","de":"Sesam","fr":"Sésame","es":"Sésamo","he":"שומשום"}', 11, true, now()),
  ('SULPHITES', 1, '{"pt":"Sulfitos","en":"Sulphites","de":"Sulfite","fr":"Sulfites","es":"Sulfitos","he":"סולפיטים"}', 12, true, now()),
  ('LUPIN', 1, '{"pt":"Tremoço","en":"Lupin","de":"Lupinen","fr":"Lupin","es":"Altramuces","he":"תורמוס"}', 13, true, now()),
  ('MOLLUSCS', 4, '{"pt":"Moluscos","en":"Molluscs","de":"Weichtiere","fr":"Mollusques","es":"Moluscos","he":"רכיכות"}', 14, true, now())
ON CONFLICT (code) DO UPDATE SET
  severity = EXCLUDED.severity,
  name_i18n = EXCLUDED.name_i18n,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at;

-- 2. Payload do menu público: allergens com code, severity, name_i18n
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
                  SELECT COALESCE(jsonb_agg(
                    jsonb_build_object('code', al.code, 'severity', al.severity, 'name_i18n', al.name_i18n)
                    ORDER BY al.sort_order
                  ), '[]'::jsonb)
                  FROM menu_item_allergens mia
                  JOIN allergens al ON al.id = mia.allergen_id AND al.is_active = true
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
