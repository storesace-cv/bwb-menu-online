"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Button, Spinner } from "@/components/admin";

type ImportResult = {
  ok: boolean;
  detected_type?: string;
  run_id?: string;
  counts?: { read_rows: number; upserted: number; updated: number; unchanged: number; discontinued: number };
  error?: string;
};

export function ExcelImportForStore({
  storeId,
  tenantNif,
}: {
  storeId: string;
  tenantNif: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const canImport = storeId && tenantNif && file && file.name.toLowerCase().endsWith(".xlsx");

  async function handleImport() {
    if (!canImport || !file) return;
    setImporting(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("store_id", storeId);
      form.append("tenant_nif", tenantNif);
      form.append("file", file);
      const res = await fetch("/api/portal-admin/import/excel", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as ImportResult & { error?: string };
      setResult({
        ok: res.ok && data.ok !== false,
        run_id: data.run_id,
        counts: data.counts,
        error: data.error ?? (res.ok ? undefined : "Erro na importação"),
      });
      if (res.ok && data.ok) setFile(null);
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Erro de rede" });
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-lg font-medium text-slate-200 mb-2">Importar / actualizar ficheiro Excel</h2>
      <p className="text-slate-400 text-sm mb-4">
        A origem dos dados desta loja é Excel (NET-bo ou ZSbms). Carregue um ficheiro .xlsx para importar ou actualizar o catálogo e o menu.
      </p>
      <div className="space-y-3 mb-4">
        <div>
          <label htmlFor="excel-file-store" className="block text-sm font-medium text-slate-300 mb-1">
            Ficheiro .xlsx
          </label>
          <input
            id="excel-file-store"
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFile(f ?? null);
              setResult(null);
            }}
            className="block w-full max-w-md text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:font-medium"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleImport}
          disabled={!canImport || importing}
          className="px-4 py-2"
        >
          {importing ? (
            <>
              <Spinner className="w-4 h-4 mr-2 inline" />
              A importar...
            </>
          ) : (
            "Importar"
          )}
        </Button>
        <Link href="/portal-admin/import/runs" className="text-sm text-emerald-400 hover:text-emerald-300">
          Ver histórico de importações
        </Link>
      </div>
      {result && (
        <div className="mt-4 p-3 rounded-lg bg-slate-800 border border-slate-700">
          {result.ok ? (
            <>
              <p className="text-emerald-300 text-sm font-medium mb-2">Importação concluída</p>
              {result.counts && (
                <ul className="text-slate-300 text-sm list-disc list-inside mb-2">
                  <li>Linhas lidas: {result.counts.read_rows}</li>
                  <li>Inseridas: {result.counts.upserted}</li>
                  <li>Atualizadas: {result.counts.updated}</li>
                  <li>Sem alteração: {result.counts.unchanged}</li>
                  <li>Descontinuadas: {result.counts.discontinued}</li>
                </ul>
              )}
              {result.run_id && (
                <Link
                  href={`/portal-admin/import/runs/${result.run_id}`}
                  className="text-emerald-400 hover:text-emerald-300 text-sm"
                >
                  Ver detalhe desta importação
                </Link>
              )}
            </>
          ) : (
            <>
              <p className="text-red-300 text-sm font-medium">Erro</p>
              <p className="text-slate-300 text-sm">{result.error ?? "Erro desconhecido"}</p>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
