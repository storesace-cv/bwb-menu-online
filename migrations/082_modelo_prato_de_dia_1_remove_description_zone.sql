-- Modelo Prato de Dia 1: remover zona "description" do zoneOrder em layout_definition e layout_definition_mobile
-- quando presente, para que a apresentação do menu público não mostre descrição quando o modelo a tem desactivada.

-- layout_definition: remover 'description' do zoneOrder se existir
UPDATE public.menu_presentation_templates
SET layout_definition = jsonb_set(
  layout_definition,
  '{zoneOrder}',
  COALESCE(
    (
      SELECT jsonb_agg(elem ORDER BY ord)
      FROM (
        SELECT j.value AS elem, j.ordinality AS ord
        FROM jsonb_array_elements(COALESCE(layout_definition->'zoneOrder', '[]'::jsonb)) WITH ORDINALITY AS j(value, ordinality)
        WHERE j.value #>> '{}' != 'description'
      ) sub
    ),
    COALESCE(layout_definition->'zoneOrder', '[]'::jsonb)
  )
)
WHERE name = 'Modelo Prato de Dia 1'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(layout_definition->'zoneOrder', '[]'::jsonb)) AS t WHERE t = 'description');

-- layout_definition_mobile: idem
UPDATE public.menu_presentation_templates
SET layout_definition_mobile = jsonb_set(
  layout_definition_mobile,
  '{zoneOrder}',
  COALESCE(
    (
      SELECT jsonb_agg(elem ORDER BY ord)
      FROM (
        SELECT j.value AS elem, j.ordinality AS ord
        FROM jsonb_array_elements(COALESCE(layout_definition_mobile->'zoneOrder', '[]'::jsonb)) WITH ORDINALITY AS j(value, ordinality)
        WHERE j.value #>> '{}' != 'description'
      ) sub
    ),
    COALESCE(layout_definition_mobile->'zoneOrder', '[]'::jsonb)
  )
)
WHERE name = 'Modelo Prato de Dia 1'
  AND layout_definition_mobile IS NOT NULL
  AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(layout_definition_mobile->'zoneOrder', '[]'::jsonb)) AS t WHERE t = 'description');
