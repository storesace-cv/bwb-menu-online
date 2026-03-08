-- Admin RPCs for import_field_mappings (list + update). Superadmin only.

CREATE OR REPLACE FUNCTION public.admin_list_import_field_mappings(p_source_type text DEFAULT NULL)
RETURNS SETOF public.import_field_mappings
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_superadmin() THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT id, source_type, source_field, target_field, transform, is_active, created_at
  FROM public.import_field_mappings
  WHERE (p_source_type IS NULL OR source_type = p_source_type)
  ORDER BY source_type, source_field, target_field;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_import_field_mapping(
  p_id uuid,
  p_target_field text,
  p_transform jsonb,
  p_is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_superadmin() THEN
    RAISE EXCEPTION 'Forbidden: superadmin required';
  END IF;
  UPDATE public.import_field_mappings
  SET target_field = nullif(trim(p_target_field), ''),
      transform = COALESCE(p_transform, '{"type":"copy"}'::jsonb),
      is_active = p_is_active
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_import_field_mappings(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_import_field_mappings(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_import_field_mapping(uuid, text, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_import_field_mapping(uuid, text, jsonb, boolean) TO service_role;
