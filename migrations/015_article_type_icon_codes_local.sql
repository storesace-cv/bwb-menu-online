-- Align article_types.icon_code with local icon set: fish, meat, seafood, veggie, hot-spice.
-- take-away and on-promo are reserved by the app and not selectable as article types.
UPDATE public.article_types
SET icon_code = CASE icon_code
  WHEN 'beef' THEN 'meat'
  WHEN 'lobster' THEN 'seafood'
  WHEN 'plant' THEN 'veggie'
  WHEN 'vehicle' THEN 'meat'
  WHEN 'percent' THEN 'fish'
  ELSE icon_code
END
WHERE icon_code IN ('beef', 'lobster', 'plant', 'vehicle', 'percent');
