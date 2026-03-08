-- Import field mappings: raw source fields -> catalog/menu targets (for future use).
-- UI for editing mappings is P1/P2; defaults seeded here.

CREATE TABLE IF NOT EXISTS public.import_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_field text NOT NULL,
  target_field text NOT NULL,
  transform jsonb NOT NULL DEFAULT '{"type":"copy"}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_field, target_field)
);

CREATE INDEX IF NOT EXISTS idx_import_field_mappings_source_type ON public.import_field_mappings(source_type);

-- Default mappings for excel_netbo
INSERT INTO public.import_field_mappings (source_type, source_field, target_field, transform) VALUES
  ('excel_netbo', 'codigo', 'catalog_items.external_id', '{"type":"copy"}'),
  ('excel_netbo', 'Produto', 'catalog_items.name_original', '{"type":"copy"}'),
  ('excel_netbo', 'PVP1', 'catalog_items.price_original', '{"type":"number"}'),
  ('excel_netbo', 'Ativo', 'catalog_items.is_active', '{"type":"boolean"}')
ON CONFLICT (source_type, source_field, target_field) DO NOTHING;

-- Default mappings for excel_zsbms
INSERT INTO public.import_field_mappings (source_type, source_field, target_field, transform) VALUES
  ('excel_zsbms', 'codigo', 'catalog_items.external_id', '{"type":"copy"}'),
  ('excel_zsbms', 'Descrição', 'catalog_items.name_original', '{"type":"copy"}'),
  ('excel_zsbms', 'PVP1', 'catalog_items.price_original', '{"type":"number"}')
ON CONFLICT (source_type, source_field, target_field) DO NOTHING;
