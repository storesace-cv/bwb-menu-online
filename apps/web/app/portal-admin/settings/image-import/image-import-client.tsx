"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Button, Card, BwbTable, Select, Alert } from "@/components/admin";
import type { ColumnDef } from "@/lib/admin/bwbTableSort";
import { updateImageSource } from "../../actions";

type FileResult = {
  filename: string;
  code: string;
  item_id: string | null;
  item_name: string | null;
  status: "saved" | "ignored" | "unmatched" | "error";
  message?: string;
};

const IMAGE_SOURCE_OPTIONS = [
  { value: "storage", label: "Supabase Storage (upload por código)" },
  { value: "url", label: "URL por artigo (image_url)" },
  { value: "legacy_path", label: "Path legado (image_path)" },
] as const;

export function ImageImportClient({ storeId, initialImageSource }: { storeId: string; initialImageSource: string }) {
  const [imageSourceState, formAction] = useFormState(updateImageSource, null);
  const [overwrite, setOverwrite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FileResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResults(null);
    const form = e.currentTarget;
    const input = form.querySelector<HTMLInputElement>('input[type="file"][name="files"]');
    if (!input?.files?.length) {
      setError("Selecione pelo menos um ficheiro.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("store_id", storeId);
      formData.set("overwrite", overwrite ? "true" : "false");
      for (let i = 0; i < input.files.length; i++) {
        formData.append("files", input.files[i]);
      }
      const res = await fetch("/api/portal-admin/settings/image-import/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? res.statusText ?? "Erro ao importar");
        return;
      }
      setResults(data.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-5 bg-slate-800/50 border-slate-700">
        <h2 className="text-lg font-medium text-slate-200 mb-3">Método de leitura de imagens</h2>
        <form action={formAction} className="flex flex-col gap-4 max-w-md mb-0">
          <input type="hidden" name="store_id" value={storeId} />
          <Select
            id="image_source"
            name="image_source"
            label="Método de leitura de imagens"
            defaultValue={initialImageSource}
          >
            {IMAGE_SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="primary">Guardar método</Button>
          {imageSourceState?.error && <Alert variant="error">{imageSourceState.error}</Alert>}
        </form>
      </Card>

      <Card className="p-5 bg-slate-800/50 border-slate-700">
        <h2 className="text-lg font-medium text-slate-200 mb-3">Como funciona</h2>
        <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
          <li>O nome do ficheiro deve conter o <strong>código do artigo</strong> (ex.: <code className="bg-slate-700 px-1 rounded">12345.jpg</code>, <code className="bg-slate-700 px-1 rounded">12345_prato.png</code>, <code className="bg-slate-700 px-1 rounded">ABC123.webp</code>). O código é o que aparece antes do primeiro &quot;_&quot;, &quot;-&quot; ou espaço.</li>
          <li>Formatos recomendados para upload: <strong>JPG</strong> ou <strong>PNG</strong> (WebP também aceite).</li>
          <li>Tamanho recomendado da imagem original: lado maior entre 800 e 1600 px (ex.: 1200×900). Evite imagens com mais de 3000 px no lado maior e ficheiros muito pesados; o ideal é menos de 1–2 MB.</li>
          <li>A aplicação converte automaticamente para <strong>WebP</strong> e gera duas versões otimizadas: 320×240 e 640×480.</li>
          <li>Usamos enquadramento <strong>4:3</strong> com corte centrado (fit=cover). Garanta que o prato está centrado na foto para um melhor resultado.</li>
        </ul>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="files" className="block text-sm font-medium text-slate-300 mb-1">
            Ficheiros
          </label>
          <input
            id="files"
            name="files"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-emerald-600 file:text-white file:font-medium file:cursor-pointer hover:file:bg-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="overwrite"
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
          />
          <label htmlFor="overwrite" className="text-sm text-slate-300">
            Substituir imagens existentes
          </label>
        </div>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "A importar…" : "Importar"}
        </Button>
        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </form>

      {results && results.length > 0 && (
        <Card className="p-5 overflow-x-auto">
          <h3 className="text-lg font-medium text-slate-200 mb-3">Resultado</h3>
          <BwbTable<FileResult>
            columns={[
              {
                key: "filename",
                label: "Ficheiro",
                type: "text",
                accessor: (r) => r.filename,
                render: (r) => r.filename,
              },
              {
                key: "code",
                label: "Código",
                type: "text",
                accessor: (r) => r.code,
                render: (r) => r.code || "—",
              },
              {
                key: "item_name",
                label: "Artigo",
                type: "text",
                accessor: (r) => r.item_name ?? "",
                render: (r) => r.item_name ?? "—",
              },
              {
                key: "status",
                label: "Estado",
                type: "text",
                accessor: (r) => r.status,
                render: (r) => {
                  if (r.status === "saved") return <span className="text-emerald-400">Guardado</span>;
                  if (r.status === "ignored") return <span className="text-amber-400">Ignorado</span>;
                  if (r.status === "unmatched") return <span className="text-slate-400">Sem artigo</span>;
                  if (r.status === "error") return <span className="text-red-400">{r.message ?? "Erro"}</span>;
                  return "—";
                },
              },
            ]}
            rows={results}
            rowKey={(r) => `${r.filename}-${r.code}-${r.item_id ?? ""}`}
            defaultSort={[{ key: "filename", direction: "asc", type: "text" }]}
            tableClassName="text-sm"
          />
        </Card>
      )}
    </div>
  );
}
