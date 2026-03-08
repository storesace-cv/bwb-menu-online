"use client";

import { useState, useMemo } from "react";
import { updateImportFieldMapping } from "../../actions";
import { Button, Alert, BwbTable } from "@/components/admin";
import type { ColumnDef } from "@/lib/admin/bwbTableSort";

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

const PVP_OPTIONS = ["PVP1", "PVP2", "PVP3", "PVP4", "PVP5"] as const;
const PRICE_ORIGINAL_TARGET = "catalog_items.price_original";

type EditState = {
  sourceField?: string;
  targetField?: string;
  transformType?: string;
  isActive?: boolean;
};

function ImportMappingsGroupTable({ list }: { list: MappingRow[] }) {
  const [editState, setEditState] = useState<Record<string, EditState>>({});
  const [savingState, setSavingState] = useState<Record<string, boolean>>({});
  const [resultState, setResultState] = useState<Record<string, { error?: string } | null>>({});

  const getSourceField = (row: MappingRow) => editState[row.id]?.sourceField ?? row.source_field;
  const getTargetField = (row: MappingRow) => editState[row.id]?.targetField ?? row.target_field;
  const getTransformTypeVal = (row: MappingRow) => editState[row.id]?.transformType ?? getTransformType(row.transform);
  const getIsActive = (row: MappingRow) => editState[row.id]?.isActive ?? row.is_active;

  const dirty = (row: MappingRow) => {
    const isPriceMapping = row.target_field === PRICE_ORIGINAL_TARGET;
    return (
      (isPriceMapping && getSourceField(row) !== row.source_field) ||
      getTargetField(row) !== row.target_field ||
      getTransformTypeVal(row) !== getTransformType(row.transform) ||
      getIsActive(row) !== row.is_active
    );
  };

  const handleSave = async (row: MappingRow) => {
    setResultState((prev) => ({ ...prev, [row.id]: null }));
    setSavingState((prev) => ({ ...prev, [row.id]: true }));
    try {
      const isPriceMapping = row.target_field === PRICE_ORIGINAL_TARGET;
      const res = await updateImportFieldMapping(
        row.id,
        getTargetField(row),
        { type: getTransformTypeVal(row) },
        getIsActive(row),
        isPriceMapping ? getSourceField(row) : undefined
      );
      setResultState((prev) => ({ ...prev, [row.id]: res ?? null }));
    } catch {
      setResultState((prev) => ({ ...prev, [row.id]: { error: "Erro ao guardar. Tente novamente." } }));
    } finally {
      setSavingState((prev) => ({ ...prev, [row.id]: false }));
    }
  };

  const columns: ColumnDef<MappingRow>[] = useMemo(
    () => [
      {
        key: "source_field",
        label: "Campo origem",
        type: "text",
        accessor: (r) => getSourceField(r),
        render: (row) => {
          const isPriceMapping = row.target_field === PRICE_ORIGINAL_TARGET;
          const value = getSourceField(row);
          if (isPriceMapping) {
            return (
              <select
                value={PVP_OPTIONS.includes(value as (typeof PVP_OPTIONS)[number]) ? value : "PVP1"}
                onChange={(e) =>
                  setEditState((prev) => ({
                    ...prev,
                    [row.id]: { ...prev[row.id], sourceField: e.target.value },
                  }))
                }
                className="rounded bg-slate-800 border border-slate-600 px-2 py-1 text-slate-200 text-sm focus:ring-2 focus:ring-emerald-500"
              >
                {PVP_OPTIONS.map((pvp) => (
                  <option key={pvp} value={pvp}>{pvp}</option>
                ))}
              </select>
            );
          }
          return <span className="text-slate-200">{row.source_field}</span>;
        },
      },
      {
        key: "target_field",
        label: "Campo destino",
        type: "text",
        accessor: (r) => getTargetField(r),
        render: (row) => (
          <input
            type="text"
            value={getTargetField(row)}
            onChange={(e) =>
              setEditState((prev) => ({
                ...prev,
                [row.id]: { ...prev[row.id], targetField: e.target.value },
              }))
            }
            className="w-full max-w-xs rounded bg-slate-800 border border-slate-600 px-2 py-1 text-slate-200 text-sm focus:ring-2 focus:ring-emerald-500"
            placeholder="ex: catalog_items.name_original"
          />
        ),
      },
      {
        key: "transform",
        label: "Transformação",
        type: "text",
        accessor: (r) => getTransformTypeVal(r),
        render: (row) => (
          <select
            value={getTransformTypeVal(row)}
            onChange={(e) =>
              setEditState((prev) => ({
                ...prev,
                [row.id]: { ...prev[row.id], transformType: e.target.value },
              }))
            }
            className="rounded bg-slate-800 border border-slate-600 px-2 py-1 text-slate-200 text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="copy">copy</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
          </select>
        ),
      },
      {
        key: "is_active",
        label: "Ativo",
        type: "text",
        accessor: (r) => (getIsActive(r) ? "Sim" : "Não"),
        render: (row) => (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={getIsActive(row)}
              onChange={(e) =>
                setEditState((prev) => ({
                  ...prev,
                  [row.id]: { ...prev[row.id], isActive: e.target.checked },
                }))
              }
              className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-slate-200">{getIsActive(row) ? "Sim" : "Não"}</span>
          </label>
        ),
      },
      {
        key: "actions",
        label: "Ações",
        type: "text",
        sortable: false,
        render: (row) => (
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="primary"
              onClick={() => handleSave(row)}
              disabled={savingState[row.id] || !dirty(row)}
            >
              {savingState[row.id] ? "A guardar…" : "Guardar"}
            </Button>
            {resultState[row.id]?.error && (
              <Alert variant="error" className="text-xs">{resultState[row.id]?.error}</Alert>
            )}
          </div>
        ),
      },
    ],
    [editState, savingState, resultState]
  );

  return (
    <BwbTable<MappingRow>
      columns={columns}
      rows={list}
      rowKey={(r) => r.id}
      defaultSort={[{ key: "source_field", direction: "asc", type: "text" }]}
      tableClassName="text-sm"
    />
  );
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
          <ImportMappingsGroupTable list={list} />
        </section>
      ))}
    </div>
  );
}
