"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Input, Select, Button, Alert, Spinner } from "@/components/admin";

type SafeConfig = {
  integration_type: "none" | "netbo" | "storesace";
  netbo_dbname?: string;
  netbo_auth_method?: "login_password" | "api_token";
  netbo_login?: string;
  netbo_company_server_url?: string;
  netbo_token_last_ok_at?: string;
  has_netbo_password_encrypted: boolean;
  has_netbo_api_token_encrypted: boolean;
};

type LastRun = {
  id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  counts: { fetched?: number; upserted?: number; errors?: number } | null;
  error: string | null;
} | null;

export function IntegrationForm({
  storeId,
  lastRun,
}: {
  storeId: string;
  lastRun: LastRun;
}) {
  const [config, setConfig] = useState<SafeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [integrationType, setIntegrationType] = useState<"none" | "netbo" | "storesace">("none");
  const [netboDbname, setNetboDbname] = useState("");
  const [netboAuthMethod, setNetboAuthMethod] = useState<"login_password" | "api_token">("login_password");
  const [netboLogin, setNetboLogin] = useState("");
  const [netboPassword, setNetboPassword] = useState("");
  const [netboApiToken, setNetboApiToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/portal-admin/store/${storeId}/integration`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) {
          setConfig(data);
          setIntegrationType(data.integration_type ?? "none");
          setNetboDbname(data.netbo_dbname ?? "");
          setNetboAuthMethod(data.netbo_auth_method ?? "login_password");
          setNetboLogin(data.netbo_login ?? "");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/portal-admin/store/${storeId}/integration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration_type: integrationType,
          netbo_dbname: integrationType === "netbo" ? netboDbname : undefined,
          netbo_auth_method: integrationType === "netbo" ? netboAuthMethod : undefined,
          netbo_login: integrationType === "netbo" ? netboLogin : undefined,
          netbo_password: integrationType === "netbo" && netboPassword ? netboPassword : undefined,
          netbo_api_token: integrationType === "netbo" && netboAuthMethod === "api_token" && netboApiToken ? netboApiToken : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setConfig(data);
        setMessage({ type: "ok", text: "Configuração guardada." });
      } else {
        setMessage({ type: "err", text: data.error ?? res.statusText });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setMessage(null);
    setTesting(true);
    try {
      const res = await fetch(`/api/portal-admin/store/${storeId}/netbo/test-connection`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.test_result === "ok") {
        setMessage({ type: "ok", text: `Ligação OK. Base: ${data.base_url ?? ""}` });
      } else {
        setMessage({ type: "err", text: data.error ?? "Teste falhou." });
      }
    } finally {
      setTesting(false);
    }
  }

  async function handleSync() {
    setMessage(null);
    setSyncing(true);
    try {
      const res = await fetch("/api/sync/netbo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({
          type: "ok",
          text: `Sync concluído. fetched: ${data.counts?.fetched ?? "-"}, upserted: ${data.counts?.upserted ?? "-"}, errors: ${data.counts?.errors ?? "-"}`,
        });
        window.location.reload();
      } else {
        setMessage({ type: "err", text: data.error ?? res.statusText });
      }
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <p className="text-slate-400">A carregar…</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-medium text-slate-200 mb-4">Integração externa: NET-BO</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <Select
          id="integration_type"
          label="Tipo de integração"
          value={integrationType}
          onChange={(e) => setIntegrationType(e.target.value as "none" | "netbo" | "storesace")}
        >
          <option value="none">Nenhuma</option>
          <option value="netbo">NET-BO</option>
          <option value="storesace">StoresAce</option>
        </Select>

        {integrationType === "netbo" && (
          <>
            <Input
              id="netbo_dbname"
              label="DBName (obrigatório)"
              value={netboDbname}
              onChange={(e) => setNetboDbname(e.target.value)}
              placeholder="ex: MINHAEMPRESA"
              required
            />
            <div className="mb-4">
              <span className="block text-sm font-medium text-slate-300 mb-2">Método de autenticação</span>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="netbo_auth_method"
                    checked={netboAuthMethod === "login_password"}
                    onChange={() => setNetboAuthMethod("login_password")}
                    className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-slate-300">Login / password</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="netbo_auth_method"
                    checked={netboAuthMethod === "api_token"}
                    onChange={() => setNetboAuthMethod("api_token")}
                    className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-slate-300">Token API</span>
                </label>
              </div>
            </div>

            {netboAuthMethod === "login_password" && (
              <>
                <Input
                  id="netbo_login"
                  label="Login"
                  value={netboLogin}
                  onChange={(e) => setNetboLogin(e.target.value)}
                  required
                />
                <div className="mb-4">
                  <label htmlFor="netbo_password" className="block text-sm font-medium text-slate-300 mb-1">
                    Password
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="netbo_password"
                      type={showPassword ? "text" : "password"}
                      value={netboPassword}
                      onChange={(e) => setNetboPassword(e.target.value)}
                      placeholder={config?.has_netbo_password_encrypted ? "Deixe vazio para manter a actual" : "Password"}
                      className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="px-3 py-2 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600"
                      aria-label={showPassword ? "Ocultar" : "Mostrar"}
                    >
                      {showPassword ? "🙈" : "👁"}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">A password é guardada encriptada e nunca mostrada.</p>
                </div>
              </>
            )}

            {netboAuthMethod === "api_token" && (
              <>
                <div className="mb-4">
                  <label htmlFor="netbo_api_token" className="block text-sm font-medium text-slate-300 mb-1">
                    Token API
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="netbo_api_token"
                      type={showToken ? "text" : "password"}
                      value={netboApiToken}
                      onChange={(e) => setNetboApiToken(e.target.value)}
                      placeholder={config?.has_netbo_api_token_encrypted ? "Deixe vazio para manter o actual" : "Token"}
                      className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((s) => !s)}
                      className="px-3 py-2 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600"
                      aria-label={showToken ? "Ocultar" : "Mostrar"}
                    >
                      {showToken ? "🙈" : "👁"}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">O token é guardado encriptado e nunca mostrado.</p>
                </div>
                <Input
                  id="netbo_login_opt"
                  label="Login (opcional, se a API exigir)"
                  value={netboLogin}
                  onChange={(e) => setNetboLogin(e.target.value)}
                  wrapperClassName="mb-0"
                />
              </>
            )}
          </>
        )}

        {integrationType === "storesace" && (
          <p className="text-slate-500 text-sm">StoresAce em breve. Use NET-BO para sincronizar produtos.</p>
        )}

        <div className="flex flex-wrap gap-3 items-center">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? <span className="inline-flex items-center gap-2"><Spinner className="inline-block" /> A guardar…</span> : "Guardar configuração"}
          </Button>
          {integrationType === "netbo" && (
            <>
              <Button type="button" variant="secondary" onClick={handleTest} disabled={testing}>
                {testing ? <span className="inline-flex items-center gap-2"><Spinner className="inline-block" /> A testar…</span> : "Testar ligação"}
              </Button>
              <Button type="button" variant="success" onClick={handleSync} disabled={syncing}>
                {syncing ? <span className="inline-flex items-center gap-2"><Spinner className="inline-block" /> A sincronizar…</span> : "Sincronizar agora"}
              </Button>
            </>
          )}
        </div>
      </form>

      {message && (
        <Alert variant={message.type === "err" ? "error" : "success"} className="mt-4">
          {message.text}
        </Alert>
      )}

      {lastRun && integrationType === "netbo" && (
        <div className="mt-6 pt-4 border-t border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-2">Última sync</h3>
          <p className="text-sm text-slate-400">
            Estado: {lastRun.status} · Início: {new Date(lastRun.started_at).toLocaleString()}
            {lastRun.counts && (
              <> · upserted: {lastRun.counts.upserted ?? "-"}</>
            )}
            {lastRun.error && (
              <> · Erro: {lastRun.error.slice(0, 80)}{lastRun.error.length > 80 ? "…" : ""}</>
            )}
          </p>
          <Link href="/portal-admin/sync" className="text-emerald-400 hover:text-emerald-300 text-sm mt-1 inline-block">
            Ver histórico em Sync
          </Link>
        </div>
      )}
    </Card>
  );
}
