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
- **Settings do Tenant:** Página `/portal-admin/settings` para tema/branding da loja; tabela `store_settings` (configuração por store); link Definições no layout tenant.

---

## Planeado / pendente

**(P0) DEMO FIRST (não regressão; prioridade máxima)**
- Garantir que o menu demo funciona end-to-end SEM NET-bo/StoresAce:
  - DEMO_MENU_JSON apontar para /opt/bwb-menu-online/local/menu-demo/menu-demo.json (ou path configurado)
  - scripts/bootstrap-demo-from-json.ts continua idempotente e não depende de integrações.
- Garantir que /local é sempre ignorada:
  - .gitignore mantém /local
  - deploy (rsync/scp se existir) exclui /local; NUNCA sincronizar a pasta inteira.
  - deploy só pode copiar (opcional) o ficheiro JSON explicitamente, nunca o diretório.
- Smoke tests obrigatórios (após deploy):
  - menu.bwb.pt/portal-admin (login)
  - 9999999991.menu.bwb.pt (menu público)
  - 9999999991.menu.bwb.pt/portal-admin (tenant portal)
- Política de "non-regression":
  - qualquer mudança em Nginx, middleware host/path, RLS/RPCs, formatação de preço, imagens, ou domínios deve incluir verificação de que o demo continua a renderizar com dados JSON.
- `{"detail":"Not Found"}`: matriz de smoke-tests por host/path (menu.bwb.pt/portal-admin; <nif><loja>.menu.bwb.pt; <nif><loja>.menu.bwb.pt/portal-admin); validar Nginx→porta correta + rotas existentes.

**NOTA:** Todas as tarefas abaixo devem ser implementadas de forma a NÃO interferir com o modo DEMO (dados via JSON e image_url). O DEMO é a referência de UI/UX durante o desenvolvimento.

**(P0) Bloqueadores para produção / multi-cliente**
- TLS wildcard para subdomínios (*.menu.bwb.pt) OU estratégia Cloudflare (Full/Strict + origin cert) para suportar <nif><loja>.menu.bwb.pt em escala.
- Gestão e verificação de domínios próprios (custom domains): fluxo add domain → instruções DNS → verificação → marcar verified_at; prevenção de takeover (prova de controlo do domínio).
- Canonical host / segurança de host: bloquear hosts não reconhecidos (store_domains); redirect 301 para domínio primário quando houver múltiplos.
- StoresAce connector (paridade com NET-bo): sync StoresAce com logs (sync_runs/sync_events) e upsert em catalog_items; UI de sync suportar fonte por store e mostrar erros.

**(P1) Funcionalidades essenciais do menu (produto)**
- Moeda/locale por store (store_settings.currency_code + locale) e formatação de preço no menu público (sem hardcode de moeda nos dados).
- Imagens "a sério" via Supabase Storage: upload + policies + thumbnails + limites e limpeza de órfãs; manter image_url apenas como fallback dev.
- UX do menu: rota pública /item/[id] (detalhe do item); pesquisa + filtros (alergénios, destaque, categorias); estados: indisponível / esgotado / disponível por horário (opcional simples).
- Ordenação UX: drag & drop para categorias e itens (persistindo sort_order).
- Página global /portal-admin/domains com vista agregada de domínios.

**(P2) Robustez, qualidade e operação**
- Audit log de alterações (domínios, itens, preços, visibilidade) com actor e timestamp.
- Rate limiting / hardening de endpoints sensíveis (sync, admin APIs).
- Testes e CI: GitHub Actions (lint/typecheck/build); testes mínimos: middleware host/path, RPC permission checks, bootstrap idempotência, public_menu_by_hostname shape.
- Observabilidade: logging estruturado com request_id; health matrix (menu.bwb.pt/portal-admin, subdomínio root, subdomínio /portal-admin).
- Backup/restore: política e scripts de backup Postgres (instância menu-online); export/import de menu (JSON/CSV) para onboarding rápido.
- Multi-idioma (opcional, recomendado para resorts): i18n para categorias e itens com fallback PT/EN.
- Templates: clonar menu de uma store para outra / template inicial.

---

## Como manter este ficheiro

Ao concluir uma fase ou marco, mover os itens correspondentes de **Planeado / pendente** para **Feito** e ajustar o texto se necessário. Ao definir novo trabalho (planos, issues, sprints), adicionar ou atualizar itens em **Planeado / pendente**. Em planos ou PRs que alterem o âmbito do projeto, atualizar o roadmap em conjunto com as alterações.
