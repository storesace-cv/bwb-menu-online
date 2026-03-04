-- Seed DEV/TEST: tenant 999999999, store 1, hostname 9999999991.menu.bwb.pt (lowercase).
-- Idempotente: INSERT ... ON CONFLICT DO NOTHING / upsert onde aplicável.

-- Tenant dev
INSERT INTO tenants (id, nif, name)
VALUES (
  coalesce((SELECT id FROM tenants WHERE nif = '999999999' LIMIT 1), gen_random_uuid()),
  '999999999',
  'DEV Tenant'
)
ON CONFLICT (nif) DO UPDATE SET name = EXCLUDED.name;

-- Store 1 (garantir tenant_id correto)
INSERT INTO stores (id, tenant_id, store_number, name, source_type, is_active)
SELECT
  coalesce((SELECT id FROM stores s WHERE s.tenant_id = t.id AND s.store_number = 1 LIMIT 1), gen_random_uuid()),
  t.id,
  1,
  'DEV STORE 1',
  'netbo',
  true
FROM tenants t
WHERE t.nif = '999999999'
ON CONFLICT (tenant_id, store_number) DO UPDATE SET name = EXCLUDED.name, source_type = EXCLUDED.source_type, is_active = EXCLUDED.is_active;

-- Domínio default (hostname lowercase)
INSERT INTO store_domains (store_id, hostname, domain_type, is_primary)
SELECT s.id, '9999999991.menu.bwb.pt', 'default', true
FROM stores s
JOIN tenants t ON t.id = s.tenant_id
WHERE t.nif = '999999999' AND s.store_number = 1
ON CONFLICT (hostname) DO UPDATE SET is_primary = true, domain_type = 'default';

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

-- 2 categorias + 3 itens demo (para a loja dev)
DO $$
DECLARE
  v_store_id uuid;
  v_cat1_id uuid;
  v_cat2_id uuid;
  v_item1_id uuid;
  v_item2_id uuid;
  v_item3_id uuid;
BEGIN
  SELECT s.id INTO v_store_id
  FROM stores s
  JOIN tenants t ON t.id = s.tenant_id
  WHERE t.nif = '999999999' AND s.store_number = 1
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RETURN;
  END IF;

  -- Categorias (idempotente por store_id + name)
  INSERT INTO menu_categories (store_id, name, description, sort_order, is_visible)
  SELECT v_store_id, 'Entradas', 'Entradas e petiscos', 1, true
  WHERE NOT EXISTS (SELECT 1 FROM menu_categories WHERE store_id = v_store_id AND name = 'Entradas');
  SELECT id INTO v_cat1_id FROM menu_categories WHERE store_id = v_store_id AND name = 'Entradas' LIMIT 1;

  INSERT INTO menu_categories (store_id, name, description, sort_order, is_visible)
  SELECT v_store_id, 'Pratos principais', 'Pratos do dia', 2, true
  WHERE NOT EXISTS (SELECT 1 FROM menu_categories WHERE store_id = v_store_id AND name = 'Pratos principais');
  SELECT id INTO v_cat2_id FROM menu_categories WHERE store_id = v_store_id AND name = 'Pratos principais' LIMIT 1;

  -- Itens (idempotente por store_id + menu_name)
  INSERT INTO menu_items (store_id, menu_name, menu_description, menu_price, is_visible, is_featured, sort_order)
  SELECT v_store_id, 'Sopa do dia', 'Sopa fresca do dia', 2.50, true, false, 1
  WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE store_id = v_store_id AND menu_name = 'Sopa do dia');
  SELECT id INTO v_item1_id FROM menu_items WHERE store_id = v_store_id AND menu_name = 'Sopa do dia' LIMIT 1;

  INSERT INTO menu_items (store_id, menu_name, menu_description, menu_price, is_visible, is_featured, sort_order)
  SELECT v_store_id, 'Bifana', 'Bifana no pão com mostarda', 4.00, true, true, 2
  WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE store_id = v_store_id AND menu_name = 'Bifana');
  SELECT id INTO v_item2_id FROM menu_items WHERE store_id = v_store_id AND menu_name = 'Bifana' LIMIT 1;

  INSERT INTO menu_items (store_id, menu_name, menu_description, menu_price, is_visible, is_featured, sort_order)
  SELECT v_store_id, 'Prego no prato', 'Prego com batata frita e salada', 8.50, true, false, 3
  WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE store_id = v_store_id AND menu_name = 'Prego no prato');
  SELECT id INTO v_item3_id FROM menu_items WHERE store_id = v_store_id AND menu_name = 'Prego no prato' LIMIT 1;

  -- menu_items não tem UNIQUE(store_id, menu_name); podem existir vários com mesmo nome. Usar id.
  -- Associar itens às categorias (evitar duplicar se já existir)
  IF v_cat1_id IS NOT NULL AND v_item1_id IS NOT NULL THEN
    INSERT INTO menu_category_items (category_id, menu_item_id, sort_order)
    VALUES (v_cat1_id, v_item1_id, 1)
    ON CONFLICT (category_id, menu_item_id) DO NOTHING;
  END IF;
  IF v_cat2_id IS NOT NULL AND v_item2_id IS NOT NULL THEN
    INSERT INTO menu_category_items (category_id, menu_item_id, sort_order)
    VALUES (v_cat2_id, v_item2_id, 1)
    ON CONFLICT (category_id, menu_item_id) DO NOTHING;
  END IF;
  IF v_cat2_id IS NOT NULL AND v_item3_id IS NOT NULL THEN
    INSERT INTO menu_category_items (category_id, menu_item_id, sort_order)
    VALUES (v_cat2_id, v_item3_id, 2)
    ON CONFLICT (category_id, menu_item_id) DO NOTHING;
  END IF;
END $$;
