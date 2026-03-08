-- Import runs (audit) and raw Excel import tables (immutable; upsert only via reimport).

-- import_runs: one row per import execution
CREATE TABLE IF NOT EXISTS public.import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('excel_netbo', 'excel_zsbms')),
  tenant_nif text NOT NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  file_name text,
  file_hash text,
  imported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  counts jsonb,
  error text
);

CREATE INDEX IF NOT EXISTS idx_import_runs_store_id ON public.import_runs(store_id);
CREATE INDEX IF NOT EXISTS idx_import_runs_source_type ON public.import_runs(source_type);
CREATE INDEX IF NOT EXISTS idx_import_runs_started_at ON public.import_runs(started_at DESC);

-- excel_netbo_imports: raw rows from NET-bo template (28 columns; key tenant_nif + store_id + codigo)
CREATE TABLE IF NOT EXISTS public.excel_netbo_imports (
  tenant_nif text NOT NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  produto text,
  teclado text,
  familia text,
  sub_familia text,
  afeta_stk text,
  un_stock text,
  un_venda text,
  tipo_mercad text,
  un_inv text,
  menu_flag text,
  pvp1 text,
  pvp2 text,
  pvp3 text,
  pvp4 text,
  pvp5 text,
  iva1 text,
  iva2 text,
  ativo text,
  nome_curto text,
  nome_botao text,
  zona_impr text,
  pede_peso text,
  pede_preco text,
  extra text,
  cod_barras text,
  cod_comando text,
  cod_barras_antigo text,
  source_type text NOT NULL DEFAULT 'excel_netbo',
  row_hash text,
  file_hash text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  imported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  discontinued_at timestamptz,
  is_discontinued boolean NOT NULL DEFAULT false,
  last_seen_import_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_nif, store_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_excel_netbo_imports_tenant_store ON public.excel_netbo_imports(tenant_nif, store_id);
CREATE INDEX IF NOT EXISTS idx_excel_netbo_imports_store_discontinued ON public.excel_netbo_imports(store_id, is_discontinued);
CREATE INDEX IF NOT EXISTS idx_excel_netbo_imports_codigo ON public.excel_netbo_imports(codigo);

-- excel_zsbms_imports: raw rows from ZSbms template
CREATE TABLE IF NOT EXISTS public.excel_zsbms_imports (
  tenant_nif text NOT NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  loja_raw text,
  descricao text,
  familia text,
  sub_familia text,
  pvp1 text,
  pvp2 text,
  pvp3 text,
  pvp4 text,
  pvp5 text,
  source_type text NOT NULL DEFAULT 'excel_zsbms',
  row_hash text,
  file_hash text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  imported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  discontinued_at timestamptz,
  is_discontinued boolean NOT NULL DEFAULT false,
  last_seen_import_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_nif, store_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_excel_zsbms_imports_tenant_store ON public.excel_zsbms_imports(tenant_nif, store_id);
CREATE INDEX IF NOT EXISTS idx_excel_zsbms_imports_store_discontinued ON public.excel_zsbms_imports(store_id, is_discontinued);
CREATE INDEX IF NOT EXISTS idx_excel_zsbms_imports_codigo ON public.excel_zsbms_imports(codigo);

-- RLS: superadmin can read/write; API uses service_role (bypasses RLS)
ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excel_netbo_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excel_zsbms_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS import_runs_superadmin ON public.import_runs;
CREATE POLICY import_runs_superadmin ON public.import_runs
  FOR ALL TO authenticated USING (public.current_user_is_superadmin())
  WITH CHECK (public.current_user_is_superadmin());

DROP POLICY IF EXISTS excel_netbo_imports_superadmin ON public.excel_netbo_imports;
CREATE POLICY excel_netbo_imports_superadmin ON public.excel_netbo_imports
  FOR ALL TO authenticated USING (public.current_user_is_superadmin())
  WITH CHECK (public.current_user_is_superadmin());

DROP POLICY IF EXISTS excel_zsbms_imports_superadmin ON public.excel_zsbms_imports;
CREATE POLICY excel_zsbms_imports_superadmin ON public.excel_zsbms_imports
  FOR ALL TO authenticated USING (public.current_user_is_superadmin())
  WITH CHECK (public.current_user_is_superadmin());
