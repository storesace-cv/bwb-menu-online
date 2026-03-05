-- Allow source_type 'demo' for stores (menu-demo / demo data, no sync).
-- store_integrations remains netbo/storesace only (demo stores have no integration row).

ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_source_type_check,
  ADD CONSTRAINT stores_source_type_check CHECK (source_type IN ('netbo', 'storesace', 'demo'));
