# SMTP / Email do Supabase Auth (self-hosted)

Configuração do envio de emails pelo Supabase Auth (GoTrue) na instância **menu-online**, usando variáveis definidas no `.env` da aplicação BWB Menu Online.

## Porque é “externo”

O envio de emails (reset password, magic link, confirmação, convites) **não é feito pela app Next.js**. É feito pelo serviço de autenticação do Supabase (GoTrue), que corre num container separado no stack Supabase.

- A app apenas chama os endpoints de auth (ex.: `POST /auth/v1/recover`).
- O GoTrue é que envia o email via SMTP.
- Por isso, as variáveis SMTP têm de estar no **ambiente do container auth** (prefixo `GOTRUE_SMTP_*`), e não apenas no `.env` da app.

O script `deploy/supabase/apply_smtp.sh` lê as variáveis do `.env` da app e aplica-as ao serviço **auth** da instância Supabase (ficheiro de secrets + `env_file` no docker-compose).

**Nota:** A app Next.js também envia emails (boas-vindas ao criar utilizador, reset de password) através de `lib/mailer.ts`, usando as mesmas variáveis `GOTRUE_SMTP_*` do `.env`. O container **web** da app usa `env_file: .env`, pelo que deve ter essas variáveis definidas para que os emails de criação de utilizadores e de reset sejam enviados correctamente.

## Paths no servidor

| O quê | Path |
|-------|------|
| Instância Supabase (menu-online) | `/srv/supabase/instances/menu-online` |
| Docker Compose do Supabase | `$INSTANCE_DIR/docker-compose.yml` |
| Secrets SMTP (não versionado) | `$INSTANCE_DIR/secrets/smtp.env` |
| .env da app (fonte das variáveis) | `/opt/bwb-menu-online/.env` (ou `$APP_DIR/.env`) |

O ficheiro `secrets/smtp.env` é criado e actualizado apenas no servidor pelo script; **nunca** deve ser commitado no repositório.

## Variáveis obrigatórias no .env da app

No `.env` da app (servidor) devem existir:

- `GOTRUE_SMTP_HOST`
- `GOTRUE_SMTP_PORT`
- `GOTRUE_SMTP_USER`
- `GOTRUE_SMTP_PASS`
- `GOTRUE_SMTP_ADMIN_EMAIL`
- `GOTRUE_SMTP_SENDER_NAME`

Exemplo (valores reais só no servidor, nunca no repo):

```bash
GOTRUE_SMTP_HOST=mail-eu.smtp2go.com
GOTRUE_SMTP_PORT=2525
GOTRUE_SMTP_USER=suporte@bwb.pt
GOTRUE_SMTP_PASS=********
GOTRUE_SMTP_ADMIN_EMAIL=suporte@bwb.pt
GOTRUE_SMTP_SENDER_NAME=Suporte | BWB
```

## Como aplicar

### Automático (deploy)

Em cada deploy, o `deploy/remote-update.sh` executa o **Step 3.8: Apply Supabase SMTP**, que chama:

```bash
bash /opt/bwb-menu-online/deploy/supabase/apply_smtp.sh
```

O script:

1. Lê o `.env` da app e extrai as 6 variáveis `GOTRUE_SMTP_*`.
2. Escreve `$INSTANCE_DIR/secrets/smtp.env` e define permissões (ex.: `chmod 600`).
3. Garante que o `docker-compose.yml` do Supabase inclui `env_file: - ./secrets/smtp.env` no serviço **auth** (patch idempotente).
4. Reinicia o serviço auth: `docker compose restart auth`.
5. Valida que as variáveis estão no container (sem imprimir a password).

Se alguma variável obrigatória faltar no `.env`, o script falha em produção e o deploy falha. Em `DEPLOY_ENV=dev`, emite um aviso e termina com sucesso (não aplica SMTP).

### Manual (no servidor)

```bash
export APP_DIR=/opt/bwb-menu-online
export INSTANCE_DIR=/srv/supabase/instances/menu-online
bash "$APP_DIR/deploy/supabase/apply_smtp.sh"
```

## Como testar

1. **Confirmar que o auth tem as variáveis SMTP (sem mostrar a password):**
   ```bash
   cd /srv/supabase/instances/menu-online
   docker compose exec -T auth env | grep GOTRUE_SMTP_ | sed 's/GOTRUE_SMTP_PASS=.*/GOTRUE_SMTP_PASS=***hidden***/'
   ```

2. **Teste end-to-end:** No portal-admin (ex.: https://menu.bwb.pt/portal-admin/login), usar “Esqueci-me da password” e introduzir o email. Verificar recepção do email (ex.: via SMTP2GO) e que os logs do auth não expõem a password.

## Política: nunca commitar secrets

- **Não** adicionar `secrets/smtp.env` nem ficheiros `.env` com passwords ao repositório.
- O script `apply_smtp.sh` **não cria** ficheiros no repo; só lê o `.env` no servidor e escreve `secrets/smtp.env` no servidor.
- Nunca imprimir `GOTRUE_SMTP_PASS` em stdout/stderr; em logs de validação, usar valor mascarado (ex.: `***hidden***`).

## Site URL e redirects (P2, opcional)

Se os links de reset password ou magic link apontarem para o domínio errado, configurar no GoTrue (variáveis do container auth):

- `GOTRUE_SITE_URL`: URL base da app (ex.: `https://menu.bwb.pt`).
- Lista de redirects permitidos para incluir `https://menu.bwb.pt` e, se necessário, `https://*.menu.bwb.pt`.

Isto pode ser adicionado ao mesmo `secrets/smtp.env` ou a um ficheiro de config do auth, conforme a documentação do Supabase self-hosted. O `NEXT_PUBLIC_SUPABASE_URL` da app (ex.: `https://db-menu.bwb.pt`) não é alterado por esta configuração.
