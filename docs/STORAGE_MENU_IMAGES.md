# Bucket `menu-images` (Supabase Storage)

A importação de imagens da loja (Definições → Importação de Imagens) guarda ficheiros no bucket **menu-images**.

## Criar o bucket

Se o bucket ainda não existir, crie-o no Dashboard do Supabase ou via SQL/API:

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
