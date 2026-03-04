-- RLS: allow authenticated users with store access to read sync_runs and sync_events (no write).
DROP POLICY IF EXISTS tenant_select_sync_runs ON public.sync_runs;
CREATE POLICY tenant_select_sync_runs ON public.sync_runs FOR SELECT TO authenticated
  USING (public.user_has_store_access(store_id));

DROP POLICY IF EXISTS tenant_select_sync_events ON public.sync_events;
CREATE POLICY tenant_select_sync_events ON public.sync_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sync_runs sr
      WHERE sr.id = sync_events.run_id
        AND public.user_has_store_access(sr.store_id)
    )
  );
