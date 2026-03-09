-- Returns true if the current user has store access and the store can use "Gerar descrição"
-- (either via platform AI when tenant is in platform_ai_tenants, or via store's own ai_enabled).
-- SECURITY DEFINER so we can read platform_ai_settings when the store uses platform AI.
CREATE OR REPLACE FUNCTION public.store_can_use_ai_description(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT (SELECT public.user_has_store_access(p_store_id)) THEN false
    WHEN (SELECT public.store_uses_platform_ai(p_store_id)) THEN
      (SELECT COALESCE(ai_enabled, false) FROM public.platform_ai_settings WHERE id = 1 LIMIT 1)
    ELSE
      (SELECT COALESCE((settings->>'ai_enabled')::boolean, false) FROM public.store_settings WHERE store_id = p_store_id LIMIT 1)
  END;
$$;

GRANT EXECUTE ON FUNCTION public.store_can_use_ai_description(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_can_use_ai_description(uuid) TO service_role;
