-- BWB Menu Online — schema inicial (catálogo importado vs menu overrides).
-- RLS: menu público apenas via RPC public_menu_by_hostname; backoffice RBAC em fase posterior.

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nif text UNIQUE NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Stores (por tenant)
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_number int NOT NULL,
  name text,
  source_type text NOT NULL CHECK (source_type IN ('netbo', 'storesace')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, store_number)
);

-- Domínios por loja (hostname -> store)
CREATE TABLE IF NOT EXISTS store_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  hostname text UNIQUE NOT NULL,
  domain_type text NOT NULL CHECK (domain_type IN ('default', 'custom')),
  is_primary boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_domains_hostname_lower ON store_domains (lower(hostname));

-- Integrações (NET-bo / Storesace): config em jsonb
CREATE TABLE IF NOT EXISTS store_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('netbo', 'storesace')),
  config jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sessões de integração (tokens)
CREATE TABLE IF NOT EXISTS store_integration_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  access_token text,
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Catálogo importado (nunca sobrescreve menu_items)
CREATE TABLE IF NOT EXISTS catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  external_id text NOT NULL,
  name_original text,
  unit text,
  price_original numeric(12,4),
  vat_rate numeric(5,4),
  is_active boolean NOT NULL DEFAULT true,
  external_hash text,
  external_updated_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, source_type, external_id)
);

-- Menu (overrides / categorização)
CREATE TABLE IF NOT EXISTS menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  catalog_item_id uuid REFERENCES catalog_items(id) ON DELETE SET NULL,
  menu_name text,
  menu_description text,
  menu_price numeric(12,4),
  image_path text,
  is_visible boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  prep_minutes int,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_category_items (
  category_id uuid NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, menu_item_id)
);

-- Alergénios (EU14)
CREATE TABLE IF NOT EXISTS allergens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_item_allergens (
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  allergen_id uuid NOT NULL REFERENCES allergens(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_item_id, allergen_id)
);

-- Sync runs e eventos
CREATE TABLE IF NOT EXISTS sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  status text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  counts jsonb,
  error text
);

CREATE TABLE IF NOT EXISTS sync_events (
  id bigserial PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES sync_runs(id) ON DELETE CASCADE,
  level text NOT NULL,
  message text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: habilitar por tabela; políticas de backoffice ficam para fase posterior.
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_integration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_category_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;

-- Sem políticas = ninguém pode ler por RLS (só via RPC SECURITY DEFINER ou service role).
-- Backoffice usará políticas/roles depois.

-- Função pública: menu por hostname (SECURITY DEFINER para bypass RLS de leitura).
CREATE OR REPLACE FUNCTION public_menu_by_hostname(host text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_result jsonb;
BEGIN
  SELECT store_id INTO v_store_id
  FROM store_domains
  WHERE lower(hostname) = lower(trim(host))
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RETURN jsonb_build_object('store_id', null, 'categories', '[]'::jsonb, 'error', 'store not found');
  END IF;

  SELECT jsonb_build_object(
    'store_id', v_store_id,
    'categories', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', mc.id,
          'name', mc.name,
          'description', mc.description,
          'sort_order', mc.sort_order,
          'items', (
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', mi.id,
                'menu_name', mi.menu_name,
                'menu_description', mi.menu_description,
                'menu_price', mi.menu_price,
                'image_path', mi.image_path,
                'is_featured', mi.is_featured,
                'prep_minutes', mi.prep_minutes,
                'sort_order', mci.sort_order,
                'allergens', (
                  SELECT COALESCE(jsonb_agg(jsonb_build_object('code', a.code, 'name', a.name) ORDER BY a.code), '[]'::jsonb)
                  FROM menu_item_allergens mia
                  JOIN allergens a ON a.id = mia.allergen_id
                  WHERE mia.menu_item_id = mi.id
                )
              ) ORDER BY mci.sort_order, mi.sort_order
            ), '[]'::jsonb)
            FROM menu_category_items mci
            JOIN menu_items mi ON mi.id = mci.menu_item_id AND mi.store_id = v_store_id AND mi.is_visible = true
            WHERE mci.category_id = mc.id
          )
        ) ORDER BY mc.sort_order
      ), '[]'::jsonb)
      FROM menu_categories mc
      WHERE mc.store_id = v_store_id AND mc.is_visible = true
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Allow anon to call menu RPC (public menu by hostname).
GRANT EXECUTE ON FUNCTION public_menu_by_hostname(text) TO anon;
GRANT EXECUTE ON FUNCTION public_menu_by_hostname(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public_menu_by_hostname(text) TO service_role;
