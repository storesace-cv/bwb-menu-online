-- Jobs for nginx reconfiguration (agent on host polls and runs script).
-- RPC to list all store domain hostnames (superadmin only).

CREATE TABLE IF NOT EXISTS public.nginx_reconfig_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_at timestamptz NOT NULL DEFAULT now(),
  hostnames jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'failed')),
  done_at timestamptz,
  error_message text
);

ALTER TABLE public.nginx_reconfig_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin full access to nginx_reconfig_jobs"
  ON public.nginx_reconfig_jobs FOR ALL
  USING (public.current_user_is_superadmin())
  WITH CHECK (public.current_user_is_superadmin());

CREATE OR REPLACE FUNCTION public.admin_list_all_domain_hostnames()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_superadmin() THEN
    RAISE EXCEPTION 'Forbidden: superadmin required';
  END IF;
  RETURN (SELECT coalesce(jsonb_agg(hostname ORDER BY hostname), '[]'::jsonb) FROM public.store_domains);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_all_domain_hostnames() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_all_domain_hostnames() TO service_role;
