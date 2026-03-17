-- RPC de diagnóstico: para um host, devolve qual template (e layout) é usado na primeira secção e nas suas categorias.
-- Permite verificar se as alterações ao "Modelo Prato de Dia 1" aparecem no menu (a secção/categoria tem de usar esse modelo).

CREATE OR REPLACE FUNCTION public.public_menu_layout_debug(p_host text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_store_name text;
  v_first_section_id uuid;
  v_first_section_name text;
  v_section_pt_id uuid;
  v_section_template_name text;
  v_categories jsonb;
BEGIN
  SELECT sd.store_id, s.name
  INTO v_store_id, v_store_name
  FROM store_domains sd
  JOIN stores s ON s.id = sd.store_id
  WHERE lower(sd.hostname) = lower(trim(p_host))
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RETURN jsonb_build_object('error', 'store not found', 'host', p_host);
  END IF;

  SELECT ms.id, ms.name, ms.presentation_template_id,
         (SELECT pt.name FROM menu_presentation_templates pt WHERE pt.id = ms.presentation_template_id)
  INTO v_first_section_id, v_first_section_name, v_section_pt_id, v_section_template_name
  FROM menu_sections ms
  WHERE ms.store_id = v_store_id AND ms.is_visible = true
  ORDER BY ms.is_default DESC, ms.sort_order ASC
  LIMIT 1;

  IF v_first_section_id IS NULL THEN
    RETURN jsonb_build_object(
      'store_id', v_store_id,
      'store_name', v_store_name,
      'error', 'no sections',
      'host', p_host
    );
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'category_id', mc.id,
      'category_name', mc.name,
      'category_presentation_template_id', mc.presentation_template_id,
      'category_template_name', (SELECT pt.name FROM menu_presentation_templates pt WHERE pt.id = mc.presentation_template_id),
      'resolved_template_id', COALESCE(mc.presentation_template_id, ms.presentation_template_id),
      'resolved_template_name', COALESCE(
        (SELECT pt.name FROM menu_presentation_templates pt WHERE pt.id = mc.presentation_template_id),
        (SELECT pt.name FROM menu_presentation_templates pt WHERE pt.id = ms.presentation_template_id)
      ),
      'layout_zone_order', COALESCE(
        (SELECT pt.layout_definition->'zoneOrder' FROM menu_presentation_templates pt WHERE pt.id = mc.presentation_template_id),
        (SELECT pt.layout_definition->'zoneOrder' FROM menu_presentation_templates pt WHERE pt.id = ms.presentation_template_id)
      ),
      'layout_zone_icon_sizes', COALESCE(
        (SELECT pt.layout_definition->'zoneIconSizes' FROM menu_presentation_templates pt WHERE pt.id = mc.presentation_template_id),
        (SELECT pt.layout_definition->'zoneIconSizes' FROM menu_presentation_templates pt WHERE pt.id = ms.presentation_template_id)
      )
    )
    ORDER BY mc.sort_order
  ), '[]'::jsonb)
  INTO v_categories
  FROM menu_categories mc
  JOIN menu_sections ms ON ms.id = mc.section_id
  WHERE mc.store_id = v_store_id AND mc.is_visible = true AND mc.section_id = v_first_section_id;

  RETURN jsonb_build_object(
    'host', p_host,
    'store_id', v_store_id,
    'store_name', v_store_name,
    'first_section_id', v_first_section_id,
    'first_section_name', v_first_section_name,
    'section_presentation_template_id', v_section_pt_id,
    'section_template_name', v_section_template_name,
    'categories', v_categories
  );
END;
$$;
