-- image_samples: add optional store_id so tenants can upload samples for their store.
-- store_id NULL = global (superadmin-created); non-NULL = store-specific.

ALTER TABLE public.image_samples
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_image_samples_store_id ON public.image_samples(store_id) WHERE store_id IS NOT NULL;

-- RLS: SELECT = global (store_id IS NULL) or user has access to the store
DROP POLICY IF EXISTS image_samples_select ON public.image_samples;
CREATE POLICY image_samples_select ON public.image_samples FOR SELECT TO authenticated
  USING (
    (store_id IS NULL)
    OR (store_id IS NOT NULL AND public.user_has_store_access(store_id))
  );

-- INSERT: superadmin (any) or tenant with store_id and access to that store
DROP POLICY IF EXISTS image_samples_insert ON public.image_samples;
CREATE POLICY image_samples_insert ON public.image_samples FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_is_superadmin()
    OR (store_id IS NOT NULL AND public.current_user_can_access_settings(store_id))
  );

-- UPDATE: superadmin or tenant with access to the sample's store
DROP POLICY IF EXISTS image_samples_update ON public.image_samples;
CREATE POLICY image_samples_update ON public.image_samples FOR UPDATE TO authenticated
  USING (
    public.current_user_is_superadmin()
    OR (store_id IS NOT NULL AND public.current_user_can_access_settings(store_id))
  );

-- DELETE: same as UPDATE
DROP POLICY IF EXISTS image_samples_delete ON public.image_samples;
CREATE POLICY image_samples_delete ON public.image_samples FOR DELETE TO authenticated
  USING (
    public.current_user_is_superadmin()
    OR (store_id IS NOT NULL AND public.current_user_can_access_settings(store_id))
  );
