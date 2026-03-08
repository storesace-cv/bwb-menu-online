-- Normalize hostname by stripping port so 9999999991.menu.bwb.pt:443 matches store_domains.hostname 9999999991.menu.bwb.pt.
CREATE OR REPLACE FUNCTION public.get_store_id_by_hostname(p_hostname text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_host_only text := split_part(lower(trim(p_hostname)), ':', 1);
BEGIN
  SELECT store_id INTO v_store_id
  FROM public.store_domains
  WHERE split_part(lower(trim(hostname)), ':', 1) = v_host_only
  LIMIT 1;
  RETURN v_store_id;
END;
$$;
