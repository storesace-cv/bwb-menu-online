# Node.js no servidor de deploy

O script de deploy (`deploy/remote-update.sh`) executa os bootstraps (superadmin, dev-tenant, demo) com **Node.js no host**. É necessário ter `node` e `npx` disponíveis no PATH do utilizador que corre o deploy (ex.: root ou o utilizador do systemd).

Recomendado: **Node.js 20 LTS** (ou 18 LTS).

## Debian / Ubuntu (apt)

```bash
# NodeSource: Node 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar
node -v   # v20.x.x
npx -v
```

## Alternativa: nvm (por utilizador)

Útil se não tiveres permissão root ou quiseres várias versões:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# Reiniciar shell ou: source ~/.nvm/nvm.sh
nvm install 20
nvm use 20
node -v
npx -v
```

Se o deploy correr por systemd ou SSH não-interactivo, garantir que o PATH inclui o Node (ex.: no `.bashrc` / `.profile` do utilizador que executa o deploy, ou configurar `Environment=PATH=...` na unit do systemd).

## Porquê no host

Os scripts de bootstrap (`scripts/bootstrap-superadmin.ts`, etc.) precisam de ler o `.env` da app e de aceder à API do Supabase. Correr com Node no host simplifica o deploy (um único fluxo, sem container temporário) e facilita a depuração em caso de falha.
