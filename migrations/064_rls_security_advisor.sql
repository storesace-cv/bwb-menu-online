-- Security Advisor: enable RLS on public tables that lacked it, and add policies where RLS had no policy.
-- App uses service_role for admin API routes (bypasses RLS); migration runner uses DB role that bypasses RLS.

-- 1) Errors: tables without RLS

ALTER TABLE public.app_schema_migrations ENABLE ROW LEVEL SECURITY;
-- No policy: only migration runner (bypass RLS) should access this table.

ALTER TABLE public.import_field_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS import_field_mappings_superadmin ON public.import_field_mappings;
CREATE POLICY import_field_mappings_superadmin ON public.import_field_mappings
  FOR ALL TO authenticated
  USING (public.current_user_is_superadmin())
  WITH CHECK (public.current_user_is_superadmin());

-- 2) Suggestions: tables with RLS but no policy (add superadmin-only policy per table)

DROP POLICY IF EXISTS catalog_items_superadmin ON public.catalog_items;
CREATE POLICY catalog_items_superadmin ON public.catalog_items
  FOR ALL TO authenticated
  USING (public.current_user_is_superadmin())
  WITH CHECK (public.current_user_is_superadmin());

DROP POLICY IF EXISTS roles_superadmin ON public.roles;
CREATE POLICY roles_superadmin ON public.roles
  FOR ALL TO authenticated
  USING (public.current_user_is_superadmin())
  WITH CHECK (public.current_user_is_superadmin());

DROP POLICY IF EXISTS store_domains_superadmin ON public.store_domains;
CREATE POLICY store_domains_superadmin ON public.store_domains
  FOR ALL TO authenticated
  USING (public.current_user_is_superadmin())
  WITH CHECK (public.current_user_is_superadmin());

DROP POLICY IF EXISTS store_integration_sessions_superadmin ON public.store_integration_sessions;
CREATE POLICY store_integration_sessions_superadmin ON public.store_integration_sessions
  FOR ALL TO authenticated
  USING (public.current_user_is_superadmin())
  WITH CHECK (public.current_user_is_superadmin());

DROP POLICY IF EXISTS store_integrations_superadmin ON public.store_integrations;
CREATE POLICY store_integrations_superadmin ON public.store_integrations
  FOR ALL TO authenticated
  USING (public.current_user_is_superadmin())
  WITH CHECK (public.current_user_is_superadmin());

DROP POLICY IF EXISTS user_role_bindings_superadmin ON public.user_role_bindings;
CREATE POLICY user_role_bindings_superadmin ON public.user_role_bindings
  FOR ALL TO authenticated
  USING (public.current_user_is_superadmin())
  WITH CHECK (public.current_user_is_superadmin());
