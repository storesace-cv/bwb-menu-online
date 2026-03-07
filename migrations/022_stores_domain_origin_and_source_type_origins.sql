-- stores: domain_origin (shared/private), custom_domain; alargar source_type para origens de dados.

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS domain_origin text NOT NULL DEFAULT 'shared' CHECK (domain_origin IN ('shared', 'private')),
  ADD COLUMN IF NOT EXISTS custom_domain text;

ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_source_type_check,
  ADD CONSTRAINT stores_source_type_check CHECK (source_type IN (
    'netbo', 'storesace', 'demo',
    'manual', 'excel_zsbms', 'excel_netbo', 'excel_storesace', 'netbo_api', 'storesace_api'
  ));
