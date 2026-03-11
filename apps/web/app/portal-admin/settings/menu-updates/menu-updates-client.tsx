"use client";

import { useState } from "react";
import { Card, Button, Spinner } from "@/components/admin";

export function MenuUpdatesClient() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    ok?: boolean;
    updated?: number;
    skipped?: number;
    total_rows?: number;
    errors?: string[];
    error?: string;
  } | null>(null);

  function handleExport() {
    window.location.href = "/api/portal-admin/settings/menu-updates/export";
  }

  async function handleImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.querySelector<HTMLInputElement>('input[type="file"]');
    const file = input?.files?.[0];
    if (!file) {
      setResult({ ok: false, error: "Seleccione um ficheiro .xlsx" });
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setResult({ ok: false, error: "O ficheiro deve ser .xlsx" });
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/portal-admin/settings/menu-updates/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setResult({
          ok: true,
          updated: data.updated,
          skipped: data.skipped,
          total_rows: data.total_rows,
          errors: data.errors,
        });
        input.value = "";
      } else {
        setResult({ ok: false, error: data.error ?? "Erro na importação" });
      }
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : "Erro de rede" });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 max-w-3xl">
      <Card className="p-5">
        <h2 className="text-lg font-medium text-slate-200 mb-2">Exportar</h2>
        <p className="text-slate-400 text-sm mb-4">
          Descarregue um ficheiro Excel com os artigos do menu. Pode editar nome, tipo, secção, categoria e outros campos permitidos e re-importar em seguida.
        </p>
        <Button onClick={handleExport} className="px-4 py-2" disabled={exporting}>
          {exporting ? (
            <>
              <Spinner className="w-4 h-4 mr-2 inline" />
              A exportar…
            </>
          ) : (
            "Exportar Excel"
          )}
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-medium text-slate-200 mb-2">Importar</h2>
        <p className="text-slate-400 text-sm mb-4">
          Carregue um ficheiro .xlsx exportado por esta página. Os artigos são actualizados pelo código. O ficheiro deve pertencer a este tenant e loja.
        </p>
        <form onSubmit={handleImport} className="space-y-3">
          <input
            type="file"
            accept=".xlsx"
            className="block w-full max-w-md text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:font-medium"
          />
          <Button type="submit" disabled={importing} className="px-4 py-2">
            {importing ? (
              <>
                <Spinner className="w-4 h-4 mr-2 inline" />
                A importar...
              </>
            ) : (
              "Importar"
            )}
          </Button>
        </form>
      </Card>

      {result && (
        <div className="sm:col-span-2 p-4 rounded-lg border border-slate-700 bg-slate-800/60">
          {result.ok ? (
            <>
              <p className="text-emerald-300 font-medium mb-2">Importação concluída</p>
              <ul className="text-slate-300 text-sm list-disc list-inside space-y-1">
                <li>Linhas no ficheiro: {result.total_rows ?? 0}</li>
                <li>Actualizados: {result.updated ?? 0}</li>
                <li>Ignorados (código inexistente ou vazio): {result.skipped ?? 0}</li>
              </ul>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2 text-amber-300 text-sm">
                  <p className="font-medium">Avisos:</p>
                  <ul className="list-disc list-inside mt-1">
                    {result.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {result.errors.length > 10 && <li>… e mais {result.errors.length - 10} erros</li>}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-red-300 font-medium">Erro</p>
              <p className="text-slate-300 text-sm mt-1">{result.error}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
