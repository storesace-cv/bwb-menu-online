# BWB Menu Online

Menu online por loja (hostname). Next.js + Supabase self-hosted.

## Estrutura

- `apps/web` — Next.js (App Router), menu público por hostname, backoffice `/admin`, `/api/health`, `/api/sync/netbo`
- `deploy/` — Scripts de deploy (update.sh local → remote-update.sh no servidor), nginx e systemd
- `migrations/` — SQL com tracking (`app_schema_migrations`) e checksums (idempotente e seguro)
- Domínio base: `menu.bwb.pt`; por loja: `<nif><store_number>.menu.bwb.pt` (ex.: `9999999991.menu.bwb.pt` para dev)

## Deploy (local → servidor)

1. Configurar SSH: alias `main-srv-01` ou variáveis `BWB_SERVER_IP` / `BWB_SERVER_HOST` (default `38.19.200.55`).
2. No servidor: clone em `/opt/bwb-menu-online`, configurar `.env` e Supabase instance em `/srv/supabase/instances/menu-online`.
3. Local: `./deploy/update.sh` — faz upload de `remote-update.sh`, corre no servidor (git pull, migrations, nginx, systemd, smoke test).

A app escuta em `127.0.0.1:8103` (Docker); Nginx faz proxy de `menu.bwb.pt` e `*.menu.bwb.pt` para essa porta. A porta 8102 é usada pelo Kong (Supabase); ver [docs/SUPABASE_INSTANCE.md](docs/SUPABASE_INSTANCE.md).

## Checklist de aceitação (primeiro marco)

- **A)** No servidor: `curl http://127.0.0.1:8103/api/health` → 200; `nginx -t` e reload ok.
- **B)** Browser: `https://9999999991.menu.bwb.pt` mostra menu (seed demo).
- **C)** Deploy: `./deploy/update.sh` (local) termina com "Health check PASSED".

## Sync NET-bo (server-only)

- Config em `store_integrations.config` (jsonb): `dbname`, `auth_method` (`login_password` | `api_token`), e conforme o método `login`/`password` ou `api_token`; opcional `server_hint`.
- `POST /api/sync/netbo` com body `{ "store_id": "uuid" }` — discovery, auth, fetch products, upsert em `catalog_items`; regista `sync_runs` e `sync_events`. Nunca altera `menu_items`.

## Variáveis de ambiente

Ver `.env.example`. Obrigatórias para a app: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ou `SUPABASE_SERVICE_ROLE_KEY` para sync). Opcional: `COMMIT_SHA` para `/api/health`.
