-- Query Performance: indexes for FK lookups used in slow PostgREST/RPC queries.
-- menu_items.catalog_item_id: LATERAL join to catalog_items; RPCs (public_menu_initial_by_hostname, get_resolved_prices_for_store, etc.).
-- menu_category_items.menu_item_id: batch WHERE menu_item_id = ANY($1); JOINs in menu RPCs.

CREATE INDEX IF NOT EXISTS idx_menu_items_catalog_item_id ON public.menu_items(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_category_items_menu_item_id ON public.menu_category_items(menu_item_id);
