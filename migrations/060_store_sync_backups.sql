-- Backup antes de import Excel ou sync NET-bo. Um backup por loja (sobrescrito a cada nova actualização).

CREATE TABLE IF NOT EXISTS public.store_sync_backups (
  store_id uuid NOT NULL PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  backup_type text NOT NULL CHECK (backup_type IN ('excel_netbo', 'excel_zsbms', 'netbo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  snapshot jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_store_sync_backups_created_at ON public.store_sync_backups(created_at DESC);

ALTER TABLE public.store_sync_backups ENABLE ROW LEVEL SECURITY;

-- Leitura: utilizadores com acesso à loja podem ver o backup.
DROP POLICY IF EXISTS store_sync_backups_select ON public.store_sync_backups;
CREATE POLICY store_sync_backups_select ON public.store_sync_backups
  FOR SELECT TO authenticated
  USING (public.user_has_store_access(store_id));

-- Inserção/actualização/eliminação apenas por service_role (APIs fazem backup e restauro com client admin).
-- Sem policy INSERT/UPDATE/DELETE para authenticated: apenas service_role pode escrever.
