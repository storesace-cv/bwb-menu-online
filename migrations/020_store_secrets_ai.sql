-- Store-level encrypted secrets (e.g. OpenAI/xAI API keys). One row per store.
-- RLS: only users with store access can read/write; API routes further restrict to store_admin for settings.
CREATE TABLE IF NOT EXISTS store_secrets (
  store_id uuid PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  openai_api_key_enc text,
  xai_api_key_enc text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE store_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_store_secrets ON public.store_secrets;
CREATE POLICY tenant_select_store_secrets ON public.store_secrets FOR SELECT TO authenticated
  USING (public.user_has_store_access(store_id));

DROP POLICY IF EXISTS tenant_insert_store_secrets ON public.store_secrets;
CREATE POLICY tenant_insert_store_secrets ON public.store_secrets FOR INSERT TO authenticated
  WITH CHECK (public.user_has_store_access(store_id));

DROP POLICY IF EXISTS tenant_update_store_secrets ON public.store_secrets;
CREATE POLICY tenant_update_store_secrets ON public.store_secrets FOR UPDATE TO authenticated
  USING (public.user_has_store_access(store_id))
  WITH CHECK (public.user_has_store_access(store_id));

-- Rate limiting for AI description generation: count per store per hour.
CREATE TABLE IF NOT EXISTS ai_usage (
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (store_id, period_start)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_ai_usage ON public.ai_usage;
CREATE POLICY tenant_select_ai_usage ON public.ai_usage FOR SELECT TO authenticated
  USING (public.user_has_store_access(store_id));

DROP POLICY IF EXISTS tenant_insert_ai_usage ON public.ai_usage;
CREATE POLICY tenant_insert_ai_usage ON public.ai_usage FOR INSERT TO authenticated
  WITH CHECK (public.user_has_store_access(store_id));

DROP POLICY IF EXISTS tenant_update_ai_usage ON public.ai_usage;
CREATE POLICY tenant_update_ai_usage ON public.ai_usage FOR UPDATE TO authenticated
  USING (public.user_has_store_access(store_id))
  WITH CHECK (public.user_has_store_access(store_id));
