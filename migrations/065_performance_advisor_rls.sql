-- Performance Advisor: auth_rls_initplan (profiles) and multiple_permissive_policies (import_runs).
-- Use (select auth.uid()) so it is evaluated once per query; consolidate import_runs SELECT into one policy.

-- 1) profiles: auth.uid() in InitPlan (evaluate once per query)
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- 2) import_runs: single policy per (role, action) — merge SELECT, separate INSERT/UPDATE/DELETE for superadmin
DROP POLICY IF EXISTS import_runs_superadmin ON public.import_runs;
DROP POLICY IF EXISTS import_runs_store_access ON public.import_runs;

CREATE POLICY import_runs_select ON public.import_runs
  FOR SELECT TO authenticated
  USING (public.current_user_is_superadmin() OR public.user_has_store_access(store_id));

CREATE POLICY import_runs_insert_superadmin ON public.import_runs
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_superadmin());

CREATE POLICY import_runs_update_superadmin ON public.import_runs
  FOR UPDATE TO authenticated
  USING (public.current_user_is_superadmin())
  WITH CHECK (public.current_user_is_superadmin());

CREATE POLICY import_runs_delete_superadmin ON public.import_runs
  FOR DELETE TO authenticated
  USING (public.current_user_is_superadmin());
