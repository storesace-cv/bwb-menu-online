-- Allow updating source_field for price mapping (PVP1..PVP5). Superadmin only.

CREATE OR REPLACE FUNCTION public.admin_update_import_field_mapping(
  p_id uuid,
  p_target_field text,
  p_transform jsonb,
  p_is_active boolean,
  p_source_field text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid_pvp text[] := ARRAY['PVP1','PVP2','PVP3','PVP4','PVP5'];
BEGIN
  IF NOT public.current_user_is_superadmin() THEN
    RAISE EXCEPTION 'Forbidden: superadmin required';
  END IF;

  IF p_source_field IS NOT NULL AND trim(p_source_field) <> '' THEN
    IF NOT (trim(p_source_field) = ANY(v_valid_pvp)) THEN
      RAISE EXCEPTION 'source_field for price must be one of PVP1, PVP2, PVP3, PVP4, PVP5';
    END IF;
    UPDATE public.import_field_mappings
    SET source_field = trim(p_source_field),
        target_field = nullif(trim(p_target_field), ''),
        transform = COALESCE(p_transform, '{"type":"copy"}'::jsonb),
        is_active = p_is_active
    WHERE id = p_id
      AND target_field = 'catalog_items.price_original';
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  UPDATE public.import_field_mappings
  SET target_field = nullif(trim(p_target_field), ''),
      transform = COALESCE(p_transform, '{"type":"copy"}'::jsonb),
      is_active = p_is_active
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_import_field_mapping(uuid, text, jsonb, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_import_field_mapping(uuid, text, jsonb, boolean, text) TO service_role;
