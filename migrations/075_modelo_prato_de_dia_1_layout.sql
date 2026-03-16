-- Modelo Prato de Dia 1: garantir que a zona "Nome do Dia" (daily_name) tem número de linha
-- e percentagem para aparecer correctamente. Sem zoneLineNumbers.daily_name a zona ficava
-- na linha 1 (default) junto com "name"; com daily_name na linha 2 aparece numa linha própria.

UPDATE public.menu_presentation_templates
SET layout_definition = jsonb_set(
  jsonb_set(
    layout_definition,
    '{zoneLineNumbers}',
    COALESCE(layout_definition->'zoneLineNumbers', '{}'::jsonb) || '{"daily_name": 2}'::jsonb
  ),
  '{zoneWidthPercent}',
  COALESCE(layout_definition->'zoneWidthPercent', '{}'::jsonb) || '{"daily_name": 100}'::jsonb
)
WHERE name = 'Modelo Prato de Dia 1'
  AND (layout_definition->'zoneLineNumbers'->'daily_name') IS NULL;
