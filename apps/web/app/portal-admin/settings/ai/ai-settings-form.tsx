"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Input, Select, Button, Alert, Spinner } from "@/components/admin";
import type { AISettingsSafe } from "@/app/api/portal-admin/settings/ai/route";

const OPENAI_LINKS = [
  { href: "https://developers.openai.com/api/docs/quickstart/", label: "OpenAI Quickstart (API key)" },
  { href: "https://developers.openai.com/api/reference/overview/", label: "OpenAI API Auth overview" },
  { href: "https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety", label: "Boas práticas de segurança de keys" },
];

const XAI_LINKS = [
  { href: "https://docs.x.ai/developers/quickstart", label: "xAI Quickstart / API keys" },
  { href: "https://console.x.ai/", label: "xAI Console" },
  { href: "https://docs.x.ai/developers/rest-api-reference/files", label: "Base URL e auth header (Bearer)" },
];

export function AISettingsForm({ storeId }: { storeId: string }) {
  const [config, setConfig] = useState<AISettingsSafe | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiProvider, setAiProvider] = useState<"openai" | "xai" | "disabled">("disabled");
  const [aiModel, setAiModel] = useState("");
  const [aiTemperature, setAiTemperature] = useState(0.7);
  const [aiMaxChars, setAiMaxChars] = useState(200);
  const [aiTone, setAiTone] = useState("profissional e apetitoso (pt-PT)");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; provider?: string; model?: string; latency_ms?: number } | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/portal-admin/settings/ai?store_id=${encodeURIComponent(storeId)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) {
          setConfig(data);
          setAiEnabled(!!data.ai_enabled);
          setAiProvider(data.ai_provider ?? "disabled");
          setAiModel(data.ai_model ?? (data.ai_provider === "xai" ? "grok-3-mini" : "gpt-4o-mini"));
          setAiTemperature(typeof data.ai_temperature === "number" ? data.ai_temperature : 0.7);
          setAiMaxChars(typeof data.ai_max_chars === "number" ? data.ai_max_chars : 200);
          setAiTone(typeof data.ai_tone === "string" && data.ai_tone ? data.ai_tone : "profissional e apetitoso (pt-PT)");
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
    setTestResult(null);
    setSaving(true);
    try {
      const res = await fetch("/api/portal-admin/settings/ai/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          ai_enabled: aiEnabled,
          ai_provider: aiProvider,
          ai_model: aiModel || null,
          ai_temperature: aiTemperature,
          ai_max_chars: aiMaxChars,
          ai_tone: aiTone || null,
          api_key: apiKey.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setConfig((c) =>
          c
            ? {
                ...c,
                has_openai_key: data.has_openai_key ?? c.has_openai_key,
                has_xai_key: data.has_xai_key ?? c.has_xai_key,
              }
            : c
        );
        setMessage({ type: "ok", text: "Configuração guardada." });
        setApiKey("");
      } else {
        setMessage({ type: "err", text: data.error ?? res.statusText });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setMessage(null);
    setTestResult(null);
    setTesting(true);
    try {
      const res = await fetch("/api/portal-admin/settings/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId }),
      });
      const data = await res.json().catch(() => ({}));
      setTestResult({
        ok: data.ok ?? false,
        message: data.message ?? "Erro desconhecido",
        provider: data.provider,
        model: data.model,
        latency_ms: data.latency_ms,
      });
      if (!res.ok) {
        setMessage({ type: "err", text: data.message ?? data.error ?? "Teste falhou." });
      } else if (data.ok) {
        setMessage({ type: "ok", text: `Ligação OK${data.latency_ms != null ? ` (${data.latency_ms} ms)` : ""}.` });
      }
    } finally {
      setTesting(false);
    }
  }

  const hasKeyForProvider =
    (aiProvider === "openai" && config?.has_openai_key) ||
    (aiProvider === "xai" && config?.has_xai_key);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Spinner />
        <span>A carregar…</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Passo 1 */}
      <Card className="p-5">
        <h2 className="text-lg font-medium text-slate-100 mb-3">1. Ativar / Provider</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-slate-300 text-sm">
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => setAiEnabled(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
            />
            Ativar funcionalidades de IA
          </label>
          <div>
            <label htmlFor="ai-provider" className="block text-sm font-medium text-slate-300 mb-1">
              Provider
            </label>
            <Select
              id="ai-provider"
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value as "openai" | "xai" | "disabled")}
            >
              <option value="openai">OpenAI (ChatGPT)</option>
              <option value="xai">xAI (Grok)</option>
              <option value="disabled">Desativado</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Passo 2 */}
      <Card className="p-5">
        <h2 className="text-lg font-medium text-slate-100 mb-3">2. Criar chave API</h2>
        {aiProvider === "openai" && (
          <div className="text-sm text-slate-400 space-y-2">
            <p>1) Criar conta ou entrar em OpenAI.</p>
            <p>2) Criar API key no dashboard.</p>
            <p>3) Copiar a chave.</p>
            <p className="pt-2">Links oficiais:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              {OPENAI_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {aiProvider === "xai" && (
          <div className="text-sm text-slate-400 space-y-2">
            <p>1) Abrir xAI Console.</p>
            <p>2) Gerar API key (API Keys page).</p>
            <p>3) Copiar a chave.</p>
            <p className="pt-2">Links oficiais:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              {XAI_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {aiProvider === "disabled" && (
          <p className="text-sm text-slate-500">Selecione um provider acima.</p>
        )}
      </Card>

      {/* Passo 3 */}
      <Card className="p-5">
        <h2 className="text-lg font-medium text-slate-100 mb-3">3. Inserir chave API</h2>
        {(aiProvider === "openai" || aiProvider === "xai") && (
          <div className="space-y-2">
            {hasKeyForProvider && (
              <p className="text-sm text-slate-400">Chave configurada. Deixe vazio para manter.</p>
            )}
            <div className="flex gap-2 items-center max-w-md">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API Key"
                className="flex-1 rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((s) => !s)}
                className="px-3 py-2 text-sm text-slate-400 hover:text-slate-200"
                aria-label={showApiKey ? "Ocultar" : "Mostrar"}
              >
                {showApiKey ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Passo 4 */}
      <Card className="p-5">
        <h2 className="text-lg font-medium text-slate-100 mb-3">4. Testar ligação</h2>
        <Button type="button" variant="secondary" onClick={handleTest} disabled={testing || aiProvider === "disabled" || !hasKeyForProvider}>
          {testing ? <span className="inline-flex items-center gap-2"><Spinner className="inline-block" /> A testar…</span> : "Testar ligação"}
        </Button>
        {testResult && (
          <div className={`mt-3 text-sm ${testResult.ok ? "text-emerald-400" : "text-amber-400"}`}>
            {testResult.ok ? "Sucesso" : "Erro"}: {testResult.message}
            {testResult.latency_ms != null && ` (${testResult.latency_ms} ms)`}
          </div>
        )}
      </Card>

      {/* Passo 5 */}
      <Card className="p-5">
        <h2 className="text-lg font-medium text-slate-100 mb-3">5. Configurar comportamento</h2>
        <p className="text-sm text-slate-400 mb-3">Recomendado manter 1–2 frases e não inventar ingredientes.</p>
        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          <Input
            id="ai-model"
            label="Modelo"
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            placeholder={aiProvider === "xai" ? "grok-3-mini" : "gpt-4o-mini"}
          />
          <Input
            id="ai-max-chars"
            label="Comprimento máximo (caracteres)"
            type="number"
            min={50}
            max={500}
            value={aiMaxChars}
            onChange={(e) => setAiMaxChars(parseInt(e.target.value, 10) || 200)}
          />
          <div className="sm:col-span-2">
            <label htmlFor="ai-tone" className="block text-sm font-medium text-slate-300 mb-1">Tom</label>
            <textarea
              id="ai-tone"
              value={aiTone}
              onChange={(e) => setAiTone(e.target.value)}
              rows={2}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500"
              placeholder="profissional e apetitoso (pt-PT)"
            />
          </div>
          <div>
            <label htmlFor="ai-temperature" className="block text-sm font-medium text-slate-300 mb-1">Criatividade (temperature)</label>
            <input
              id="ai-temperature"
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={aiTemperature}
              onChange={(e) => setAiTemperature(parseFloat(e.target.value) || 0.7)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white"
            />
          </div>
        </div>
      </Card>

      {/* Passo 6 */}
      <Card className="p-5">
        <h2 className="text-lg font-medium text-slate-100 mb-2">6. Ativar no editor de artigos</h2>
        <p className="text-sm text-slate-400 mb-2">
          Quando ativo, aparece um botão &quot;Gerar descrição&quot; no editor de artigos.
        </p>
        <Link href="/portal-admin/settings/items" className="text-emerald-400 hover:text-emerald-300 text-sm">
          Ir para Gestão de Artigos →
        </Link>
      </Card>

      {message && (
        <Alert variant={message.type === "ok" ? "success" : "error"}>{message.text}</Alert>
      )}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? <span className="inline-flex items-center gap-2"><Spinner className="inline-block" /> A guardar…</span> : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
