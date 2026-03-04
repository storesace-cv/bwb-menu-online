# Roadmap — BWB Menu Online

Este documento regista o que já está feito e o que está planeado, para manter visibilidade do estado do projeto.

---

## Feito

- **Marco inicial:** Next.js (App Router), `/api/health`, Docker em 8103, migrations 000–002, deploy (update.sh, remote-update.sh, nginx, systemd), vhost wildcard (menu.bwb.pt e *.menu.bwb.pt), menu público por hostname, seed dev (tenant/store/domínio e alergénios EU14).
- **Doc e porta:** Documentação da instância Supabase ([docs/SUPABASE_INSTANCE.md](docs/SUPABASE_INSTANCE.md)); app a escutar em 8103 (Kong mantém 8102).
- **Migrations no deploy:** Ordem estável com `sort -V`; falha se o container Postgres não for encontrado; referência no README às migrations automáticas.
- **2 portais + Superadmin:** Middleware por host/path (global vs tenant vs público); RBAC (migrations 003/004: profiles, roles, user_role_bindings); RPCs admin (tenant, store, domain, list); bootstraps superadmin (suporte@bwb.pt) e dev-tenant; change-password obrigatório; UI Global Admin (tenants, tenants/[id]/stores, stores/[id]/domains); UI Tenant Admin (menu com categorias, items com lista e criação); seed 002 apenas com alergénios (tenant/store/domínio dev via bootstrap).
- **Demo via JSON:** Pasta `/local` ignorada em .gitignore e deploy; coluna `menu_items.image_url` (migration 006); script `scripts/bootstrap-demo-from-json.ts`; passo opcional no deploy quando `DEMO_MENU_JSON` e ficheiro existem; UI do menu a usar `image_url` quando `image_path` não existe; exemplo em `scripts/menu-demo.example.json` e secção no README.
- **Sync NET-bo (backend):** `POST /api/sync/netbo` e `lib/netbo` (discovery, auth, fetch products, upsert em `catalog_items`, `sync_runs` e `sync_events`; nunca altera `menu_items`).
- **Gestão de utilizadores no Global Admin:** Página `/portal-admin/users` para listar e atribuir utilizadores e roles (tenant/store); criar/convitar utilizador via Admin API do Supabase e inserção em `profiles` e `user_role_bindings`; RPCs `admin_list_users` e `admin_assign_role`; API route POST `/api/portal-admin/users`; acessível apenas a superadmin.
- **UI Sync no Tenant:** Página `/portal-admin/sync` para disparar sync NET-bo e listar `sync_runs` e eventos; RLS para leitura por loja (migration 008); API com verificação `user_has_store_access`.

---

## Planeado / pendente
- **Settings do Tenant:** Página `/portal-admin/settings` para tema/branding da loja (e eventual configuração por store).
- **Opcionais:** Rota pública `/item/[id]` para detalhe de um item do menu; página global `/portal-admin/domains` com vista agregada de domínios.

---

## Como manter este ficheiro

Ao concluir uma fase ou marco, mover os itens correspondentes de **Planeado / pendente** para **Feito** e ajustar o texto se necessário. Ao definir novo trabalho (planos, issues, sprints), adicionar ou atualizar itens em **Planeado / pendente**. Em planos ou PRs que alterem o âmbito do projeto, atualizar o roadmap em conjunto com as alterações.
