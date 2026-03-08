"use client";

import { useState } from "react";
import { updateImportFieldMapping } from "../../actions";
import { Button, Alert, TableContainer } from "@/components/admin";

export type MappingRow = {
  id: string;
  source_type: string;
  source_field: string;
  target_field: string;
  transform: { type?: string };
  is_active: boolean;
};

function getTransformType(transform: unknown): string {
  if (transform && typeof transform === "object" && "type" in transform && typeof (transform as { type: string }).type === "string") {
    return (transform as { type: string }).type;
  }
  return "copy";
}

export function ImportMappingsTable({ rows }: { rows: MappingRow[] }) {
  const grouped = rows.reduce<Record<string, MappingRow[]>>((acc, r) => {
    const k = r.source_type;
    if (!acc[k]) acc[k] = [];
    acc[k].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([sourceType, list]) => (
        <section key={sourceType}>
          <h2 className="text-lg font-medium text-slate-200 mb-3">{sourceType}</h2>
          <TableContainer>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-600">
                  <th className="text-left py-2 px-3 text-slate-300">Campo origem</th>
                  <th className="text-left py-2 px-3 text-slate-300">Campo destino</th>
                  <th className="text-left py-2 px-3 text-slate-300">Transformação</th>
                  <th className="text-left py-2 px-3 text-slate-300">Ativo</th>
                  <th className="text-left py-2 px-3 text-slate-300">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <MappingRowEdit
                    key={row.id}
                    row={row}
                  />
                ))}
              </tbody>
            </table>
          </TableContainer>
        </section>
      ))}
    </div>
  );
}

function MappingRowEdit({ row }: { row: MappingRow }) {
  const [targetField, setTargetField] = useState(row.target_field);
  const [transformType, setTransformType] = useState(getTransformType(row.transform));
  const [isActive, setIsActive] = useState(row.is_active);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ error?: string } | null>(null);

  const dirty =
    targetField !== row.target_field ||
    transformType !== getTransformType(row.transform) ||
    isActive !== row.is_active;

  async function handleSave() {
    setResult(null);
    setSaving(true);
    try {
      const res = await updateImportFieldMapping(row.id, targetField, { type: transformType }, isActive);
      setResult(res ?? null);
    } catch {
      setResult({ error: "Erro ao guardar. Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-b border-slate-700/50">
      <td className="py-2 px-3 text-slate-200">{row.source_field}</td>
      <td className="py-2 px-3">
        <input
          type="text"
          value={targetField}
          onChange={(e) => setTargetField(e.target.value)}
          className="w-full max-w-xs rounded bg-slate-800 border border-slate-600 px-2 py-1 text-slate-200 text-sm focus:ring-2 focus:ring-emerald-500"
          placeholder="ex: catalog_items.name_original"
        />
      </td>
      <td className="py-2 px-3">
        <select
          value={transformType}
          onChange={(e) => setTransformType(e.target.value)}
          className="rounded bg-slate-800 border border-slate-600 px-2 py-1 text-slate-200 text-sm focus:ring-2 focus:ring-emerald-500"
        >
          <option value="copy">copy</option>
          <option value="number">number</option>
          <option value="boolean">boolean</option>
        </select>
      </td>
      <td className="py-2 px-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-slate-200">{isActive ? "Sim" : "Não"}</span>
        </label>
      </td>
      <td className="py-2 px-3">
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? "A guardar…" : "Guardar"}
          </Button>
          {result?.error && (
            <Alert variant="error" className="text-xs">{result.error}</Alert>
          )}
        </div>
      </td>
    </tr>
  );
}
