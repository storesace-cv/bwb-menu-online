-- Allow authenticated users to SELECT from tenants when they have access to at least one store of that tenant.
-- Fixes export/import Excel (menu-updates): they need to read tenants.nif/name for the current store's tenant;
-- without this policy, tenantRow was null and the export showed "Tenant" instead of the actual NIF.

CREATE POLICY tenant_select_if_store_access ON public.tenants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.tenant_id = tenants.id
        AND public.user_has_store_access(s.id)
    )
  );
