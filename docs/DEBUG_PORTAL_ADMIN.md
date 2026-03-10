# Diagnóstico do portal-admin (debug log)

Para identificar a causa de problemas como ecrã branco após login ou redirects incorrectos, a app escreve logs estruturados com o prefixo `[portal-debug]`. Estes logs permitem ver exactamente que pedidos chegam ao middleware, que decisões o layout toma (pathname, isRsc, user, mustChange, redirect vs RedirectTo) e, se activado, eventos do cliente.

## Nota sobre ambiente

A app em produção corre **no servidor de deploy** (ex.: menu.bwb.pt, 9999999991.menu.bwb.pt), não no computador local. Para testar no browser ou reproduzir problemas, use os URLs do servidor (https://menu.bwb.pt/portal-admin, https://9999999991.menu.bwb.pt/portal-admin, etc.). Não use `http://localhost:3000` — aí a app não está a correr.

## Onde consultar os logs

No servidor, os logs do container web vão para stdout e ficam disponíveis via Docker:

```bash
cd /opt/bwb-menu-online
docker compose logs web
```

Para ver apenas as linhas de debug do portal-admin:

```bash
docker compose logs web 2>&1 | grep '\[portal-debug\]'
```

Para seguir em tempo real enquanto reproduz o problema:

```bash
docker compose logs -f web 2>&1 | grep --line-buffered '\[portal-debug\]'
```

## Formato das linhas

Cada linha é JSON com prefixo fixo, por exemplo:

```
[portal-debug] {"ts":"2025-03-05T12:00:00.000Z","phase":"middleware","pathname":"/portal-admin","host":"menu.bwb.pt","rsc":"1","redirectRoot":false}
[portal-debug] {"ts":"2025-03-05T12:00:00.001Z","phase":"layout","pathname":"/portal-admin","host":"menu.bwb.pt","isLoginPage":false,"isRsc":true,"userId":"anonymous","mustChangePassword":false,"decision":"redirect_login"}
```

- **phase:** `middleware` (pedido recebido), `layout` (decisão do layout), `client` (evento do browser, só se PORTAL_DEBUG=1).
- **middleware:** `pathname`, `host`, `rsc` (header RSC), `redirectRoot` (se fez redirect `/` → `/portal-admin`).
- **layout:** `pathname`, `host`, `isLoginPage`, `isRsc`, `userId` (ou `"anonymous"`), `mustChangePassword`, `decision` (`login_page` | `redirect_login` | `redirect_change_password` | `full_layout`), e em erro `error`.
- **client:** `event` (ex.: `RedirectTo`, `LoginSuccess`), `url`, `message`.

## Activar logs de eventos do cliente (opcional)

Por defeito, o middleware e o layout registam sempre. Os eventos enviados pelo browser (RedirectTo montado, LoginSuccess) só são escritos no servidor se activares o modo debug:

No `.env` do servidor (ou do container), define:

```bash
PORTAL_DEBUG=1
```

Reinicia o stack para aplicar: `systemctl restart bwb-menu-online.service` (ou `docker compose up -d`).

Com isto, após um login bem-sucedido verás também linhas `phase: "client"` com `event: "LoginSuccess"` e `event: "RedirectTo"`, permitindo correlacionar a ordem: layout devolve RedirectTo → cliente monta RedirectTo e chama router.replace.

## Como usar para diagnosticar

1. (Opcional) Definir `PORTAL_DEBUG=1` no `.env` e reiniciar.
2. Reproduzir o problema (login em https://menu.bwb.pt/portal-admin/login, navegação, etc.).
3. No servidor: `docker compose logs web 2>&1 | grep '\[portal-debug\]'` e inspeccionar as linhas por ordem temporal.
4. Verificar: pathname recebido no middleware vs no layout; valor de `isRsc`; se há user após login; decisão do layout (`redirect_login`, `redirect_change_password`, `full_layout`); e, com PORTAL_DEBUG=1, se aparecem eventos `LoginSuccess` e `RedirectTo` na ordem esperada.

Com esta sequência consegue-se identificar a origem do problema (por exemplo pathname errado, isRsc inesperado, ou cliente a não receber o payload esperado) e corrigir com precisão.

## Resultado da verificação (ecrã branco após login)

Numa verificação em servidor, os pedidos a `/portal-admin/change-password` após login bem-sucedido mostraram no layout:

- `userId: "anonymous"`, `mustChangePassword: false`, `decision: "redirect_login"`

Ou seja, o servidor **não vê a sessão** nesses pedidos: o cookie de auth não está a chegar ou a ser lido pelo `createClient()` no layout.

**Causa:** A página de login e a página change-password usavam `createClient` de `@supabase/supabase-js`, que guarda a sessão em **localStorage**. O servidor usa `createServerClient` e lê a sessão dos **cookies**; como nenhum cookie era definido, o layout via sempre `anonymous`.

**Fix aplicado:** Foi criado o cliente browser em `lib/supabase-browser.ts` com `createBrowserClient` de `@supabase/ssr`, que guarda a sessão em cookies. As páginas de login e change-password passaram a usar este cliente; após login, os cookies são enviados nos pedidos seguintes e o layout passa a ver o utilizador.

A página de login envia o evento `LoginSuccess` para `/api/debug/portal-log` **antes** de `router.push`, para o POST não ser abortado pela navegação e aparecer nos logs quando `PORTAL_DEBUG=1`.

## Diagnóstico das Server Actions em Tenants

As Server Actions da página Tenants (`updateTenantContactEmail` e `resendTenantWelcomeEmail`) registam logs com **phase** `tenants_action`. Isto permite identificar a causa de erros "Fetch failed" no cliente: saber se o pedido chegou à action, em que passo falhou (createClient, RPC, revalidatePath, auth, email) e qual a mensagem de erro.

### Formato dos logs `tenants_action`

Cada linha inclui `phase: "tenants_action"` e campos como:

- **action:** `"updateTenantContactEmail"` ou `"resendTenantWelcomeEmail"`.
- **tenantId:** primeiros 8 caracteres do ID (para correlação, sem expor o ID completo se necessário).
- **step:** ponto da execução: entrada (sem step), `createClient_ok`, `rpc_done`, `revalidatePath_ok`, `success`, `tenant_read`, `early_return`, `auth_done`, `email_sent`, ou `catch`.
- **rpcError:** (só em updateTenantContactEmail após RPC) mensagem de erro do Supabase ou `null`.
- **error:** (no catch) mensagem da exceção.
- **emailLen** / **hasContactEmail:** metadados sem valor do email (privacidade).

Para filtrar apenas estas ações nos logs:

```bash
docker compose logs web 2>&1 | grep '\[portal-debug\]' | grep tenants_action
```

### Endpoint opcional: últimas invocações em JSON

Com `PORTAL_DEBUG=1` no servidor, está disponível um GET que devolve as últimas invocações (buffer em memória, até 50 entradas), para diagnóstico sem acesso a `docker compose logs`:

```
GET https://menu.bwb.pt/api/debug/tenants-actions
```

- Se `PORTAL_DEBUG` não for `1`, o endpoint responde 404.
- A resposta é um array JSON de objetos com `ts`, `action`, `step` e restantes campos descritos acima, ordenados por `ts`.

Fluxo sugerido: definir `PORTAL_DEBUG=1`, reproduzir o problema (guardar email, Re-enviar), depois consultar os logs com o grep acima ou abrir `/api/debug/tenants-actions` no browser para inspecionar o último `step` e presença de `catch` com `error`.

## Alteração em lote (Definições → Artigos)

A Server Action `batchUpdateItemsSectionCategory` regista logs com **phase** `batch_update_section_category`. Isto permite diagnosticar "Fetch failed" ao aplicar alteração em lote: ver se o pedido chegou à action, quantos itens foram recebidos e se houve erro em delete/insert/update.

### Comandos para consultar logs no servidor

No servidor (ex.: `cd /opt/bwb-menu-online`):

```bash
docker compose logs web 2>&1 | grep '\[portal-debug\]' | tail -80
```

Para filtrar apenas alteração em lote:

```bash
docker compose logs web 2>&1 | grep '\[portal-debug\]' | grep batch_update_section_category
```

Para erros gerais e últimas linhas:

```bash
docker compose logs web 2>&1 | tail -150
```

### Formato dos logs `batch_update_section_category`

- **No início da action:** `itemCount`, `hasSection`, `hasCategory`, `batchIsVisible` (confirmam que a action foi invocada e com que dados).
- **Em sucesso:** `itemCount`, `success: true`.
- **Em falha:** `step: "delete" | "insert" | "update"`, `menuItemId`, `error` (mensagem do Supabase).

Se ao submeter o formulário **não** aparecer nenhum log desta action, a request pode estar a falhar antes de chegar à action (body size, timeout no proxy ou crash ao parsear o body).

## Gestão de Artigos (settings/items) e 502 em menu_category_items

Ao carregar a página **Gestão de Artigos**, o servidor faz queries em batch à tabela `menu_category_items` (até 200 IDs por batch). Os logs com **phase** `settings_items_mci` mostram `itemIdsCount`, `mciRowsCount` e, em falha de um batch, `batchError` e `batchIndex`.

Se aparecer **batchError** com texto tipo `502 Bad Gateway` ou HTML do nginx, o pedido do Next.js ao Supabase (ou ao proxy à frente) está a receber 502 (timeout ou upstream indisponível). Foi adicionado **retry automático**: ao detectar 502/Bad Gateway num batch, o servidor espera 1,5 s e repete esse batch uma vez. Se continuar a falhar, a página renderiza na mesma com secção/categoria em branco (—) para os itens desse batch. Para filtrar estes logs:

```bash
docker compose logs web 2>&1 | grep '\[portal-debug\]' | grep settings_items_mci
```
