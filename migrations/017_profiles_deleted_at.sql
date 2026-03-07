-- Soft delete: anular utilizador sem apagar o registo.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.profiles.deleted_at IS 'When set, user is anulado (soft deleted). NULL = active.';
