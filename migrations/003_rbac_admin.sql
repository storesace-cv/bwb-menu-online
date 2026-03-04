-- RBAC: profiles, roles, user_role_bindings.
-- Supabase: auth.users exists in schema auth.

-- Profiles (extends auth.users for app)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Roles
CREATE TABLE IF NOT EXISTS public.roles (
  code text PRIMARY KEY,
  name text NOT NULL
);

INSERT INTO public.roles (code, name) VALUES
  ('superadmin', 'Super Admin'),
  ('tenant_admin', 'Tenant Admin'),
  ('store_editor', 'Store Editor'),
  ('viewer', 'Viewer')
ON CONFLICT (code) DO NOTHING;

-- user_id + role_code + tenant_id (nullable) + store_id (nullable)
-- superadmin: tenant_id/store_id NULL; tenant_admin: tenant_id set, store_id NULL; store_editor/viewer: store_id set
CREATE TABLE IF NOT EXISTS public.user_role_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_code text NOT NULL REFERENCES public.roles(code),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (user_id, role_code, tenant_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_user_role_bindings_user ON public.user_role_bindings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_bindings_tenant ON public.user_role_bindings(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_role_bindings_store ON public.user_role_bindings(store_id) WHERE store_id IS NOT NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_bindings ENABLE ROW LEVEL SECURITY;

-- RLS: policies will be added when we enforce by role; for now allow service_role to manage.
-- Portal guard will check bindings in app layer or via RPC.
