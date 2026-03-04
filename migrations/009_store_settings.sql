-- Allow tenant users to read store name (for settings page etc.).
DROP POLICY IF EXISTS tenant_select_stores ON public.stores;
CREATE POLICY tenant_select_stores ON public.stores FOR SELECT TO authenticated
  USING (public.user_has_store_access(id));

-- Store-level settings (theme, branding). One row per store; RLS by user_has_store_access.
CREATE TABLE IF NOT EXISTS store_settings (
  store_id uuid PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_store_settings ON public.store_settings;
CREATE POLICY tenant_select_store_settings ON public.store_settings FOR SELECT TO authenticated
  USING (public.user_has_store_access(store_id));

DROP POLICY IF EXISTS tenant_insert_store_settings ON public.store_settings;
CREATE POLICY tenant_insert_store_settings ON public.store_settings FOR INSERT TO authenticated
  WITH CHECK (public.user_has_store_access(store_id));

DROP POLICY IF EXISTS tenant_update_store_settings ON public.store_settings;
CREATE POLICY tenant_update_store_settings ON public.store_settings FOR UPDATE TO authenticated
  USING (public.user_has_store_access(store_id))
  WITH CHECK (public.user_has_store_access(store_id));
