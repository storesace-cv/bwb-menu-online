# Instância Supabase: menu-online

Referência da instância Supabase self-hosted usada pelo BWB Menu Online.

| Campo | Valor |
|-------|--------|
| Project name | menu-online |
| Domain (API) | db-menu.bwb.pt |
| Public URL | https://db-menu.bwb.pt |
| Instance dir | /srv/supabase/instances/menu-online |

## Portas no servidor

### Kong (API gateway — localhost only)

- **HTTP:** 127.0.0.1:8102 → container 8000
- **HTTPS:** 127.0.0.1:9102 → container 8443

### Analytics (localhost only)

- **HTTP:** 127.0.0.1:4002 → container 4000

### Supavisor (publicado no host)

- **Postgres:** 0.0.0.0:5434 → container 5432
- **Pooler (transaction):** 0.0.0.0:6545 → container 6543

## App BWB Menu Online (porta 8103)

A app Next.js escuta em **127.0.0.1:8103** para não colidir com Kong (8102). O Nginx faz proxy de `menu.bwb.pt` e `*.menu.bwb.pt` para 8103.

## Ligação da app ao Supabase

- **API/REST (Supabase client):** usar a Public URL `https://db-menu.bwb.pt` em `NEXT_PUBLIC_SUPABASE_URL`. O Nginx do projeto inclui o vhost `deploy/nginx/sites-available/db-menu.bwb.pt`, que faz proxy de `db-menu.bwb.pt` para Kong (127.0.0.1:8102). É necessário certificado SSL para `db-menu.bwb.pt` (certbot ou wildcard *.bwb.pt).
- **Migrações / acesso directo à BD:** usar `host=127.0.0.1 port=5434` (Supavisor) ou o container Postgres da instância, conforme deteção em `deploy/remote-update.sh` (variável `SUPABASE_POSTGRES_CONTAINER` ou deteção por imagem/nome).

## Bootstrap superadmin (deploy / primeiro login)

O script `scripts/bootstrap-superadmin.ts` cria ou actualiza o utilizador `suporte@bwb.pt` com role superadmin. No servidor:

- O `.env` em `/opt/bwb-menu-online` deve ter `NEXT_PUBLIC_SUPABASE_URL=https://db-menu.bwb.pt` e `SUPABASE_SERVICE_ROLE_KEY` para este bootstrap correr durante o deploy. Após alterar o `.env`, é necessário rebuild da imagem e restart do serviço para o novo URL ser inlined no bundle.
- **Node.js** tem de estar instalado no host (o deploy usa `npx tsx` para os scripts de bootstrap). Ver [NODE_ON_SERVER.md](NODE_ON_SERVER.md).

Primeiro login no Portal Admin: **suporte@bwb.pt** / **naomexer** (a menos que a password tenha sido alterada depois).
