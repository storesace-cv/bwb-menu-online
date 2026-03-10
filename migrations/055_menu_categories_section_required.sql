-- Ensure every category has a section (one-to-one: category belongs to exactly one section).
-- Backfill NULL section_id, then set NOT NULL and change FK to ON DELETE RESTRICT.

DO $$
DECLARE
  v_store_id uuid;
  v_section_id uuid;
BEGIN
  FOR v_store_id IN
    SELECT DISTINCT mc.store_id
    FROM menu_categories mc
    WHERE mc.section_id IS NULL
  LOOP
    -- Prefer first section by sort_order for this store
    SELECT id INTO v_section_id
    FROM menu_sections
    WHERE store_id = v_store_id
    ORDER BY sort_order ASC NULLS LAST
    LIMIT 1;

    IF v_section_id IS NOT NULL THEN
      UPDATE menu_categories
      SET section_id = v_section_id
      WHERE store_id = v_store_id AND section_id IS NULL;
    ELSE
      -- No section exists: create "Geral" and assign categories to it
      INSERT INTO menu_sections (store_id, name, sort_order)
      VALUES (v_store_id, 'Geral', 0)
      RETURNING id INTO v_section_id;

      UPDATE menu_categories
      SET section_id = v_section_id
      WHERE store_id = v_store_id AND section_id IS NULL;
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.menu_categories ALTER COLUMN section_id SET NOT NULL;

ALTER TABLE public.menu_categories
  DROP CONSTRAINT IF EXISTS menu_categories_section_id_fkey;

ALTER TABLE public.menu_categories
  ADD CONSTRAINT menu_categories_section_id_fkey
  FOREIGN KEY (section_id) REFERENCES public.menu_sections(id) ON DELETE RESTRICT;
