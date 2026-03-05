# Diagnóstico do portal-admin (debug log)

Para identificar a causa de problemas como ecrã branco após login ou redirects incorrectos, a app escreve logs estruturados com o prefixo `[portal-debug]`. Estes logs permitem ver exactamente que pedidos chegam ao middleware, que decisões o layout toma (pathname, isRsc, user, mustChange, redirect vs RedirectTo) e, se activado, eventos do cliente.

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
