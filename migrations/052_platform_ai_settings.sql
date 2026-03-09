-- Platform (superadmin) AI settings: single row. Used when offering ChatGPT/Grok as a service to selected tenants.
CREATE TABLE IF NOT EXISTS platform_ai_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ai_enabled boolean NOT NULL DEFAULT false,
  ai_provider text CHECK (ai_provider IN ('openai', 'xai', 'disabled')),
  ai_model text,
  ai_temperature float,
  ai_max_chars int,
  ai_tone text,
  last_test_ok_at timestamptz,
  last_test_error text,
  openai_api_key_enc text,
  xai_api_key_enc text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE platform_ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS superadmin_platform_ai_settings ON public.platform_ai_settings;
CREATE POLICY superadmin_platform_ai_settings ON public.platform_ai_settings
  FOR ALL TO authenticated
  USING (public.current_user_is_superadmin())
  WITH CHECK (public.current_user_is_superadmin());

INSERT INTO platform_ai_settings (id, ai_enabled, ai_provider) VALUES (1, false, 'disabled')
ON CONFLICT (id) DO NOTHING;

-- Tenants that use platform AI (their stores use platform_ai_settings for "Gerar descrição"; their Definições hide "ChatGPT / Grok").
CREATE TABLE IF NOT EXISTS platform_ai_tenants (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE
);

ALTER TABLE platform_ai_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS superadmin_platform_ai_tenants ON public.platform_ai_tenants;
CREATE POLICY superadmin_platform_ai_tenants ON public.platform_ai_tenants
  FOR ALL TO authenticated
  USING (public.current_user_is_superadmin())
  WITH CHECK (public.current_user_is_superadmin());

-- Returns true if the store's tenant is in platform_ai_tenants. Callable by any authenticated user (returns only boolean).
CREATE OR REPLACE FUNCTION public.store_uses_platform_ai(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM stores s
    INNER JOIN platform_ai_tenants t ON s.tenant_id = t.tenant_id
    WHERE s.id = p_store_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.store_uses_platform_ai(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_uses_platform_ai(uuid) TO service_role;
