-- Modelo Prato de Dia 1: campo Nome com metade da largura (50%) e menos espaço vertical
-- entre Nome e Nome do Dia (rowSpacingPx = 4, metade do default 8).

UPDATE public.menu_presentation_templates
SET layout_definition = jsonb_set(
  jsonb_set(
    layout_definition,
    '{zoneWidthPercent}',
    COALESCE(layout_definition->'zoneWidthPercent', '{}'::jsonb) || '{"name": 50}'::jsonb
  ),
  '{rowSpacingPx}',
  '4'::jsonb
)
WHERE name = 'Modelo Prato de Dia 1';
