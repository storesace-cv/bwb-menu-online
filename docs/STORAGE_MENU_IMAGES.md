# Bucket `menu-images` (Supabase Storage)

A importação de imagens da loja (Definições → Importação de Imagens) guarda ficheiros no bucket **menu-images**.

## Criação automática

O bucket **é criado automaticamente** na primeira utilização da importação de imagens (ou no primeiro pedido à API de upload) se não existir. A API usa a service role e chama `createBucket('menu-images', { public: true })` quando o bucket não está presente. Não é necessário criar o bucket manualmente para a importação funcionar.

## Criação manual (opcional)

Se quiser criar o bucket antecipadamente (por exemplo em ambientes onde a API não use service role), pode fazê-lo no Dashboard do Supabase ou via SQL:

**Dashboard:** Storage → New bucket → nome `menu-images`, opção **Public** ativada (leitura pública para o menu).

**SQL (Supabase SQL Editor):**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;
```

**Política:** Objetos são escritos apenas pela API (service role). A leitura é pública para URLs do tipo  
`{SUPABASE_URL}/storage/v1/object/public/menu-images/tenants/.../640.webp` e `.../320.webp`.

Não é necessário criar políticas adicionais para leitura se o bucket for público; o upload é feito com a service role key na API.
