"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Button, Spinner } from "@/components/admin";

type StoreOption = {
  tenant_nif: string;
  store_id: string;
  store_number: number;
  store_name: string | null;
  source_type: string;
  hostname: string | null;
};

const EXCEL_SOURCE_TYPES = ["excel_netbo", "excel_zsbms", "manual"];

function storeLabel(s: StoreOption): string {
  const n = s.store_name ?? `Loja ${s.store_number}`;
  const host = s.hostname ? ` (${s.hostname})` : "";
  return `${s.tenant_nif} — ${n}${host}`;
}

type ImportResult = {
  ok: boolean;
  detected_type?: string;
  run_id?: string;
  counts?: { read_rows: number; upserted: number; updated: number; unchanged: number; discontinued: number };
  error?: string;
};

export function ExcelImportCard() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/portal-admin/import/stores");
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data.stores) ? data.stores : [];
        if (!cancelled) {
          setStores(list);
          if (list.length === 1) setSelectedStoreId(list[0].store_id);
        }
      } finally {
        if (!cancelled) setLoadingStores(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedStore = stores.find((s) => s.store_id === selectedStoreId);
  const isCompatible = selectedStore
    ? EXCEL_SOURCE_TYPES.includes(selectedStore.source_type)
    : false;
  const canImport = isCompatible && selectedStoreId && file && file.name.toLowerCase().endsWith(".xlsx");
  const tenantNif = selectedStore?.tenant_nif ?? "";

  const handleImport = async () => {
    if (!canImport || !file) return;
    setImporting(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("store_id", selectedStoreId);
      form.append("tenant_nif", tenantNif);
      form.append("file", file);
      const res = await fetch("/api/portal-admin/import/excel", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as ImportResult;
      setResult(data);
      if (data.ok) setFile(null);
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Erro de rede" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="p-5 mt-6">
      <h2 className="text-lg font-medium text-slate-200 mb-2">Importar dados via Excel</h2>
      <p className="text-slate-400 text-sm mb-2">
        Suporta NET-bo (Teclados) e ZSbms (Teclados).
      </p>
      <p className="text-slate-400 text-sm mb-3">
        Origens suportadas: <strong>excel_netbo</strong>, <strong>excel_zsbms</strong>.
      </p>
      <p className="text-amber-200/90 text-sm mb-4">
        A origem de dados definida na loja deve ser compatível.
      </p>

      {loadingStores ? (
        <p className="text-slate-400 text-sm flex items-center gap-2">
          <Spinner className="w-4 h-4" /> A carregar lojas...
        </p>
      ) : stores.length === 0 ? (
        <p className="text-slate-500 text-sm">Nenhuma loja disponível.</p>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            <div>
              <label htmlFor="excel-store" className="block text-sm font-medium text-slate-300 mb-1">
                Loja (obrigatório)
              </label>
              <select
                id="excel-store"
                value={selectedStoreId}
                onChange={(e) => {
                  setSelectedStoreId(e.target.value);
                  setResult(null);
                }}
                className="w-full max-w-md rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">— Escolha a loja —</option>
                {stores.map((s) => (
                  <option key={s.store_id} value={s.store_id}>
                    {storeLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            {selectedStore && !isCompatible && (
              <p className="text-amber-200/90 text-sm">
                A loja está configurada para <strong>{selectedStore.source_type}</strong>. Mude a Origem dos Dados em Definições ou escolha outra loja.
              </p>
            )}
            <div>
              <label htmlFor="excel-file" className="block text-sm font-medium text-slate-300 mb-1">
                Ficheiro .xlsx
              </label>
              <input
                id="excel-file"
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
          <div className="flex items-center gap-3">
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
                      Ver import run
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
        </>
      )}
    </Card>
  );
}
