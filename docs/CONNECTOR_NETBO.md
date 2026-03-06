# Conector NET-BO (BWB Menu Online)

Configuração por loja para integração com a API NET-BO: descoberta do servidor, autenticação e PULL de produtos para `catalog_items`. Os segredos (password, token API) são guardados encriptados no servidor e nunca expostos ao browser.

## Campos da configuração (store_integrations.config)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `integration_type` | `"none"` \| `"netbo"` \| `"storesace"` | Tipo de integração activa. |
| `netbo_dbname` | string | DBName da empresa (obrigatório para NET-BO). |
| `netbo_auth_method` | `"login_password"` \| `"api_token"` | Método de autenticação. |
| `netbo_login` | string | Login (para login_password; opcional para api_token). |
| `netbo_password_encrypted` | string | Password cifrada (só no servidor; nunca devolvida ao cliente). |
| `netbo_api_token_encrypted` | string | Token API cifrado (só no servidor). |
| `netbo_company_server_url` | string | URL do servidor (cache após teste de ligação). |
| `netbo_token_last_ok_at` | string (ISO) | Data do último teste de ligação com sucesso. |
| `timeout_sec` | number | Timeout em segundos (opcional, default 30). |
| `retries` | number | Número de tentativas (opcional). |
| `retry_backoff_sec` | number | Backoff entre tentativas (opcional). |

O cliente recebe apenas uma config “safe”, com flags `has_netbo_password_encrypted` e `has_netbo_api_token_encrypted` (boolean), sem valores de segredos.

## Endpoints NET-BO usados

- **Discovery:**  
  `GET https://companies.api.net-bo.com/companies/detailed?company=<dbname>`  
  Resposta: objeto com campo `server` (ou `Server`, `host`, `url`, `base_url`) indicando o host do servidor (ex.: `empresa123`). Base URL da API: `https://<server>.api.net-bo.com`.

- **Auth (login/password):**  
  `GET https://<server>.api.net-bo.com/api/auth?db=<dbname>&login=<login>&passwd=<password>`  
  Resposta: token em JSON (`token` ou `access_token`) ou em texto. O token é usado em pedidos seguintes.

- **Teste de ligação (leve):**  
  `GET https://<server>.api.net-bo.com/api/tables/units?db=<dbname>&limit=1`  
  Com header `Authorization: Bearer <token>` ou, para alguns ambientes, com `token=` na query string.

- **Produtos (sync):**  
  `GET https://<server>.api.net-bo.com/api/tables/products?db=<dbname>`  
  Com header `Authorization: Bearer <token>`. Resposta: array de produtos ou objeto com `data`/`products`/`items`.

## Exemplos curl

**Discovery:**
```bash
curl -s "https://companies.api.net-bo.com/companies/detailed?company=MINHAEMPRESA"
```

**Auth:**
```bash
curl -s "https://<server>.api.net-bo.com/api/auth?db=MINHAEMPRESA&login=user&passwd=secret"
```

**Units (teste):**
```bash
curl -s -H "Authorization: Bearer <TOKEN>" \
  "https://<server>.api.net-bo.com/api/tables/units?db=MINHAEMPRESA&limit=1"
```

**Products:**
```bash
curl -s -H "Authorization: Bearer <TOKEN>" \
  "https://<server>.api.net-bo.com/api/tables/products?db=MINHAEMPRESA"
```

## Troubleshooting

- **Discovery: server not found**  
  Verificar que o `dbname` está correcto e que a resposta de `companies/detailed` contém um dos campos: `server`, `Server`, `host`, `url`, `base_url`.

- **Auth failed 401/403**  
  Verificar login/password ou token; em modo token, algumas instalações exigem o token na query string em vez do header (o conector tenta ambos).

- **Timeout**  
  Aumentar `timeout_sec` na config ou verificar conectividade de rede até `*.api.net-bo.com`.

- **ENCRYPTION_MASTER_KEY not set**  
  Definir no servidor a variável `ENCRYPTION_MASTER_KEY` (mín. 32 caracteres) para guardar e ler segredos.

- **Sync não preenche menu**  
  O sync apenas actualiza `catalog_items` (PULL). Os itens do menu público vêm de `menu_items`; associar/criar itens de menu a partir do catálogo é um fluxo separado (portal-admin → Menu / Itens).
