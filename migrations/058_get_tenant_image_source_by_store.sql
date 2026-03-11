-- RPC para obter o image_source do tenant da loja (usado na Gestão de Imagens para mostrar só leitura quando definido no tenant).

CREATE OR REPLACE FUNCTION public.get_tenant_image_source_by_store_id(p_store_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT t.image_source
  FROM tenants t
  JOIN stores s ON s.tenant_id = t.id
  WHERE s.id = p_store_id
  LIMIT 1;
$$;

-- Utilizadores autenticados com acesso à loja podem obter o valor (a verificação de acesso à loja é feita na app).
GRANT EXECUTE ON FUNCTION public.get_tenant_image_source_by_store_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_image_source_by_store_id(uuid) TO service_role;
