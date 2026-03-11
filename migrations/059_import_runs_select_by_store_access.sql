-- Permitir que utilizadores com acesso à loja leiam import_runs dessa loja (para ver histórico na página Sync quando origem é Excel).

DROP POLICY IF EXISTS import_runs_store_access ON public.import_runs;
CREATE POLICY import_runs_store_access ON public.import_runs
  FOR SELECT TO authenticated
  USING (public.user_has_store_access(store_id));
