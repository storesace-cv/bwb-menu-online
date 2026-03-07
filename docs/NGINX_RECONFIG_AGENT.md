# Agente de reconfiguração Nginx (Configurar Domínio)

Quando um administrador premir **"Configurar Domínio"** no portal (Tenants → loja → Domínios), a aplicação regista um pedido na tabela `nginx_reconfig_jobs` e devolve os hostnames a incluir no Nginx. A aplicação corre em Docker e **não executa comandos no host**; um **agente no servidor** deve obter os pedidos e aplicar a configuração.

## Contrato da API

- **POST /api/portal-admin/configure-domain** (autenticado, superadmin)  
  Body: `{ "store_id": "uuid-opcional" }`.  
  Regista um job com a lista de hostnames (da loja indicada ou de todas as lojas).  
  Resposta: `{ "ok": true, "job_id": "...", "message": "..." }`.

- **GET /api/portal-admin/configure-domain?status=pending** (autenticado, superadmin)  
  Devolve os jobs pendentes: `{ "jobs": [ { "id", "requested_at", "hostnames", "status" }, ... ] }`.

## Script no repositório

O script **deploy/scripts/reconfigure-nginx.sh** deve ser executado **no host** (não dentro do container):

1. Faz backup de `/etc/nginx/sites-available/menu.bwb.pt`.
2. Gera o ficheiro com `server_name menu.bwb.pt *.menu.bwb.pt` mais os hostnames passados como argumentos.
3. Executa `nginx -t` e `systemctl reload nginx`.

Uso: `./reconfigure-nginx.sh host1 host2 host3`

## Fluxo do agente (script no repositório)

O script **deploy/scripts/nginx-reconfig-agent.sh** implementa o agente no host:

1. Lê `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (ex.: de `$APP_DIR/.env`).
2. Obtém os jobs pendentes via Supabase REST: `GET .../rest/v1/nginx_reconfig_jobs?status=eq.pending` (service_role contorna RLS).
3. Para cada job: extrai `hostnames` (JSON array), invoca `reconfigure-nginx.sh` com esses hostnames como argumentos.
4. Atualiza o job via PATCH na mesma API REST: `status = 'done'` e `done_at` em caso de sucesso; `status = 'failed'` e `error_message` em caso de falha.

Requisitos no host: `bash`, `curl`, `jq`. No servidor, o `.env` em `/opt/bwb-menu-online` deve ter `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (o deploy já usa estes valores para bootstraps).

**Instalar o agente no host (após deploy):**

1. Tornar os scripts executáveis (se ainda não estiverem):
   ```bash
   chmod +x /opt/bwb-menu-online/deploy/scripts/reconfigure-nginx.sh
   chmod +x /opt/bwb-menu-online/deploy/scripts/nginx-reconfig-agent.sh
   ```
2. Garantir que `jq` está instalado: `apt install jq` (Debian/Ubuntu) ou equivalente.
3. Configurar execução periódica, por exemplo com cron (a cada 2 minutos):
   ```bash
   sudo crontab -e
   # adicionar linha:
   */2 * * * * APP_DIR=/opt/bwb-menu-online /opt/bwb-menu-online/deploy/scripts/nginx-reconfig-agent.sh
   ```
   Ou com systemd timer: criar unit de serviço e timer que invoque o script (intervalo recomendado 1–5 minutos).

## Notas

- O agente está **fora do repositório** da aplicação; este documento descreve apenas o contrato e o script que a app fornece.
- Os hostnames devolvidos pela API já vêm de `store_domains`; incluem domínios partilhados e privados.
