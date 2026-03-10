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

## Alterações à configuração Nginx

Sempre que fores alterar a configuração Nginx gerida por este projeto, segue **por esta ordem**:

### Passo 1 — Consultar o servidor

Obtém a configuração actual do servidor (vhosts geridos por este repo) para comparar com o repositório e estar a par de alterações manuais no host:

```bash
ssh main-srv-01 'cat /etc/nginx/sites-available/menu.bwb.pt'
ssh main-srv-01 'cat /etc/nginx/sites-available/db-menu.bwb.pt'
```

Compara com `deploy/nginx/sites-available/menu.bwb.pt` e `deploy/nginx/sites-available/db-menu.bwb.pt`. Se no servidor houver alterações manuais que devam ser preservadas, integra-as no repo antes de sobrescrever.

### Passo 2 — Backup no servidor

O script `deploy/nginx/apply.sh` faz **backup automático** antes de copiar: os ficheiros actuais em `/etc/nginx/sites-available/` (menu.bwb.pt, db-menu.bwb.pt) são copiados para `/opt/bwb-menu-online/nginx-backups/<timestamp>/` antes de serem substituídos. Basta correr o deploy ou o apply.sh no servidor.

Se aplicares nginx manualmente (sem deploy), faz backup antes: copia os ficheiros de `/etc/nginx/sites-available/` para um diretório com data (ex.: `sudo cp -a /etc/nginx/sites-available/menu.bwb.pt /opt/bwb-menu-online/nginx-backups/menu.bwb.pt.$(date +%Y%m%d%H%M%S)`).

### Passo 3 — Alterações

Só depois de 1 e 2: edita os ficheiros em `deploy/nginx/sites-available/` e faz deploy (ou corre `deploy/nginx/apply.sh` no servidor). O apply fará o backup e a cópia.
