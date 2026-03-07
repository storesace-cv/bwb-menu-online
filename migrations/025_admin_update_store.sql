-- RPC to update store name and/or source_type (superadmin only).

CREATE OR REPLACE FUNCTION public.admin_update_store(
  p_store_id uuid,
  p_source_type text DEFAULT NULL,
  p_name text DEFAULT NULL
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
  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'store_id required';
  END IF;
  UPDATE public.stores
  SET
    source_type = COALESCE(p_source_type, source_type),
    name = CASE WHEN p_name IS NOT NULL THEN nullif(trim(p_name), '') ELSE name END
  WHERE id = p_store_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_store(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_store(uuid, text, text) TO service_role;
