-- Seed: apenas dados de referência (ex.: alergénios EU14).
-- Tenant/store/domínio dev (999999999, store 1, 9999999991.menu.bwb.pt) e itens demo
-- passam a ser criados apenas via scripts/bootstrap-dev-tenant.ts (RPCs admin), não aqui.

-- EU14 alergénios (só se vazia)
INSERT INTO allergens (code, name) VALUES
  ('gluten', 'Glúten'),
  ('crustaceans', 'Crustáceos'),
  ('eggs', 'Ovos'),
  ('fish', 'Peixe'),
  ('peanuts', 'Amendoins'),
  ('soy', 'Soja'),
  ('milk', 'Leite'),
  ('nuts', 'Frutos de casca rija'),
  ('celery', 'Aipo'),
  ('mustard', 'Mostarda'),
  ('sesame', 'Sésamo'),
  ('sulphites', 'Dióxido de enxofre e sulfitos'),
  ('lupin', 'Tremoço'),
  ('molluscs', 'Moluscos')
ON CONFLICT (code) DO NOTHING;
