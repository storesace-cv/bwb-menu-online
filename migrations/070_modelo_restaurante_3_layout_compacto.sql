-- Modelo Restaurante 3: layout compacto alinhado ao HTML de referência
-- (padding assimétrico, espaçamentos, % prep/ícones, ícones menores, line-height nome, padding direita preço).
-- id de produção referido no plano; também por nome para ambientes que criem o template manualmente.

UPDATE public.menu_presentation_templates
SET layout_definition = '{
  "zoneOrder": ["image", "name", "prep_time", "icons", "price"],
  "macroZones": {
    "direction": "horizontal",
    "heightMode": "auto",
    "imageFirst": true,
    "splitPercent": 20,
    "imageObjectFit": "cover_1_1",
    "heightReference": "image",
    "contentScaleToFit": false
  },
  "zoneWidths": {
    "icons": "half",
    "image": "quarter",
    "price": "half",
    "prep_time": "half"
  },
  "zoneHeights": {
    "name": 0,
    "icons": 0,
    "image": 0,
    "price": 0,
    "prep_time": 0
  },
  "nameFontSize": "lg",
  "rowSpacingPx": 4,
  "priceFontSize": "base",
  "zoneAlignment": {
    "name": "left",
    "icons": "right",
    "image": "left",
    "price": "right",
    "prep_time": "left"
  },
  "nameFontWeight": "bold",
  "contentRowGapPx": 8,
  "priceLineHeight": "normal",
  "zoneLineNumbers": {
    "name": 1,
    "icons": 2,
    "image": 1,
    "prep_time": 2,
    "price": 3
  },
  "contentPaddingPx": 12,
  "contentPaddingSides": { "top": 4, "right": 0, "bottom": 0, "left": 4 },
  "zoneWidthPercent": {
    "icons": 45,
    "image": 20,
    "price": 50,
    "prep_time": 45
  },
  "zoneIconSizes": { "prep_time": 13.5, "icons": 16.5 },
  "nameLineHeight": 1.15,
  "pricePaddingRightPx": 6
}'::jsonb
WHERE id = 'f1d3f693-61ae-42de-94b5-7a2dcd2b1959'
   OR name = 'Modelo Restaurante 3';
