# Nginx no servidor

Referência das configurações Nginx do servidor onde corre a aplicação BWB Menu Online e outras apps BWB.

## Dois contextos

| Contexto | Pasta | Uso |
|----------|--------|-----|
| **Deploy deste projeto** | `deploy/nginx/sites-available/` | Ficheiros que o script de deploy copia para o servidor e activa. Apenas os vhosts **menu.bwb.pt** e **db-menu.bwb.pt** são geridos por este repo. Ver [Deploy (README)](../README.md#deploy-local--servidor). |
| **Referência do servidor** | `local/nginx/` | Cópia das **configurações actuais completas** do servidor (todos os vhosts). A pasta `local/` não é versionada (está em `.gitignore`); serve como referência para portas, domínios e outros serviços no mesmo host. |

## Conteúdo de `local/nginx/` (referência do servidor)

Ficheiros que existem no servidor em `/etc/nginx/sites-available/` (e symlinks em `sites-enabled`). Resumo:

| Ficheiro | Domínio(s) | Função | Upstream |
|----------|------------|--------|----------|
| **menu.bwb.pt** | `menu.bwb.pt`, `*.menu.bwb.pt` | App BWB Menu Online: landing em `/`, Supabase por path (`/auth`, `/rest`, etc.), `/portal-admin/` e menu público | Landing: `/var/www/menu-landing`; Kong: `127.0.0.1:8102`; Next.js: `127.0.0.1:8103` |
| **db-menu.bwb.pt** | `db-menu.bwb.pt` | Supabase (Kong) da instância menu-online (acesso directo ao API) | `127.0.0.1:8102` |
| **bwb.bwb.pt** | `bwb.bwb.pt` | Outra app (FastAPI); atalho `/studio` → db-bwb | App: `127.0.0.1:8000` |
| **db-bwb.bwb.pt** | `db-bwb.bwb.pt` | Supabase da instância BW B | `127.0.0.1:8100` |
| **zthoteis.bwb.pt** | `zthoteis.bwb.pt` | Outra app (ZThoteis); atalho `/studio` → db-zthoteis | App: `127.0.0.1:8001` |
| **db-zthoteis.bwb.pt** | `db-zthoteis.bwb.pt` | Supabase da instância ZThoteis | `127.0.0.1:8101` |
| **default** | `_` (default_server) | Config default Nginx (Debian); `root /var/www/html` | — |

## BWB Menu Online (este projeto)

- **App Next.js:** porta **8103** (Docker). Nginx faz proxy de `menu.bwb.pt` e `*.menu.bwb.pt` para `127.0.0.1:8103`.
- **Supabase (Kong) menu-online:** porta **8102**. Em `menu.bwb.pt` os paths `/auth`, `/rest`, `/realtime`, `/storage`, `/functions` são proxados para `127.0.0.1:8102`; o mesmo Kong é acessível em **https://db-menu.bwb.pt** (vhost dedicado).
- **Landing:** `/` em `menu.bwb.pt` serve ficheiros estáticos de `/var/www/menu-landing` (ex.: `index.html`, vídeos). Não há redirect automático de `/` para `/portal-admin`.
- **SSL:** Let's Encrypt; certificados em `/etc/letsencrypt/live/<dominio>/` (ex.: `menu.bwb.pt`, `db-menu.bwb.pt`).

Para detalhes da instância Supabase e variáveis de ambiente, ver [SUPABASE_INSTANCE.md](SUPABASE_INSTANCE.md).
