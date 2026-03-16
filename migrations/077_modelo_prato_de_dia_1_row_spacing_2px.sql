-- Modelo Prato de Dia 1: reduzir ainda mais o espaço vertical entre linhas (ex.: Nome e Nome do Dia).
-- rowSpacingPx de 4 para 2 (metade).

UPDATE public.menu_presentation_templates
SET layout_definition = jsonb_set(layout_definition, '{rowSpacingPx}', '2'::jsonb)
WHERE name = 'Modelo Prato de Dia 1';
