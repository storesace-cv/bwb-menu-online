# BWB Menu Online

Menu online por loja (hostname). Next.js + Supabase self-hosted.

## Estrutura

- `apps/web` — Next.js (App Router), menu público por hostname, backoffice `/admin`, `/api/health`, `/api/sync/netbo`
- `deploy/` — Scripts de deploy (update.sh local → remote-update.sh no servidor), nginx e systemd
- `migrations/` — SQL com tracking (`app_schema_migrations`) e checksums (idempotente e seguro)
- Domínio base: `menu.bwb.pt`; por loja: `<nif><store_number>.menu.bwb.pt` (ex.: `9999999991.menu.bwb.pt` para dev)

Estado do projeto e próximos passos: ver [roadmap.md](roadmap.md).

## Deploy (local → servidor)

1. Configurar SSH: alias `main-srv-01` ou variáveis `BWB_SERVER_IP` / `BWB_SERVER_HOST` (default `38.19.200.55`).
2. No servidor: clone em `/opt/bwb-menu-online`, configurar `.env` e Supabase instance em `/srv/supabase/instances/menu-online`.
3. Local: `./deploy/update.sh` — faz upload de `remote-update.sh`, corre no servidor (git pull, migrations, nginx, systemd, smoke test). Em cada deploy, as migrations em `migrations/*.sql` são aplicadas automaticamente ao Postgres da instância Supabase menu-online, por ordem (tracking e checksum em `app_schema_migrations`).

A app escuta em `127.0.0.1:8103` (Docker); Nginx faz proxy de `menu.bwb.pt` e `*.menu.bwb.pt` para essa porta. A porta 8102 é usada pelo Kong (Supabase); ver [docs/SUPABASE_INSTANCE.md](docs/SUPABASE_INSTANCE.md).

## Checklist de aceitação (primeiro marco)

- **A)** No servidor: `curl http://127.0.0.1:8103/api/health` → 200; `nginx -t` e reload ok.
- **B)** Browser: `https://9999999991.menu.bwb.pt` mostra menu (seed demo).
- **C)** Deploy: `./deploy/update.sh` (local) termina com "Health check PASSED".

## Sync NET-bo (server-only)

- Config em `store_integrations.config` (jsonb): `dbname`, `auth_method` (`login_password` | `api_token`), e conforme o método `login`/`password` ou `api_token`; opcional `server_hint`.
- `POST /api/sync/netbo` com body `{ "store_id": "uuid" }` — discovery, auth, fetch products, upsert em `catalog_items`; regista `sync_runs` e `sync_events`. Nunca altera `menu_items`.

## Dados demo via JSON (sem moeda nos dados)

Para desenvolvimento sem NET-bo/StoresAce, pode popular o menu a partir de um ficheiro JSON. A pasta `local/` **não é sincronizada** (está em `.gitignore`; o deploy não a envia).

1. Crie a pasta `local/menu-demo/` na raiz do projeto.
2. Coloque o ficheiro `menu-demo.json` nessa pasta (formato de exemplo em `scripts/menu-demo.example.json`).
3. Defina `DEMO_MENU_JSON` no `.env` (ex.: `./local/menu-demo/menu-demo.json` em local). No servidor use `DEMO_MENU_JSON=/opt/bwb-menu-online/local/menu-demo/menu-demo.json` (ou path configurado) e crie o ficheiro nesse path manualmente — a pasta `local/` não vai no deploy.
4. Execute: `cd scripts && npx tsx bootstrap-demo-from-json.ts` (usa as mesmas RPCs admin para tenant/store/domain; upsert de alergénios, categorias, itens e associações).

No deploy remoto, se `DEMO_MENU_JSON` estiver definido e o ficheiro existir no servidor, o bootstrap demo é executado automaticamente após os outros bootstraps.

**Regra:** Nos dados demo não se insere moeda (símbolo/código); o preço é numérico; a moeda vem da configuração da loja na UI.

## Política DEMO FIRST (não regressão)

Qualquer alteração a Nginx, middleware host/path, RLS/RPCs, formatação de preço, imagens ou domínios deve incluir verificação de que o menu demo (dados via JSON e `image_url`) continua a funcionar. Os smoke tests por host/path (`scripts/smoke-test-demo.sh`: menu.bwb.pt/portal-admin, 9999999991.menu.bwb.pt, 9999999991.menu.bwb.pt/portal-admin) devem passar após deploy.

## Variáveis de ambiente

Ver `.env.example`. Obrigatórias para a app: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ou `SUPABASE_SERVICE_ROLE_KEY` para sync). Opcional: `COMMIT_SHA` para `/api/health`. Para bootstrap demo: `DEMO_MENU_JSON` (path do ficheiro JSON).

No **servidor** (`/opt/bwb-menu-online/.env`), para o deploy conseguir criar o utilizador superadmin automaticamente, são necessários também `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. É igualmente necessário **Node.js** instalado no host (os bootstraps usam `npx tsx`). Ver [docs/NODE_ON_SERVER.md](docs/NODE_ON_SERVER.md). Sem isto, o bootstrap superadmin falha e o primeiro login no Portal Admin não funcionará até ser corrigido e o script executado.

## Primeiro login no Portal Admin

Após o bootstrap superadmin ter corrido com sucesso (no deploy ou manualmente), o primeiro login usa:

- **Email:** `suporte@bwb.pt`
- **Password inicial:** `naomexer`

Se a password tiver sido alterada depois (Supabase Dashboard ou API), usar a password actual. O bootstrap não redefine a password em utilizadores já existentes.
