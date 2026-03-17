-- Sincronizar layout_definition_mobile a partir de layout_definition quando mobile está null.
-- Corrige o caso em que o utilizador editou apenas no viewport "Computadores e Tablets" e no
-- smartphone o menu usava layout_definition_mobile (null) -> fallback para layout_definition,
-- mas se layout_definition_mobile tinha valor antigo, o mobile não reflectia os overrides de
-- espaçamento (rowSpacingOverrides, zoneSpacing). Com esta sync, templates que tinham mobile
-- null passam a ter mobile = desktop; os que já tinham mobile mantêm-se.

UPDATE public.menu_presentation_templates
SET layout_definition_mobile = layout_definition
WHERE layout_definition_mobile IS NULL
  AND layout_definition IS NOT NULL;

UPDATE public.menu_featured_presentation_templates
SET layout_definition_mobile = layout_definition
WHERE layout_definition_mobile IS NULL
  AND layout_definition IS NOT NULL;
