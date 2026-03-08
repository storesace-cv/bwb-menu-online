"use client";

import Link from "next/link";
import { Card, BwbTable } from "@/components/admin";
import type { ColumnDef } from "@/lib/admin/bwbTableSort";

type ImportRunRow = {
  id: string;
  source_type: string;
  tenant_nif: string | null;
  store_id: string | null;
  file_name: string | null;
  started_at: string | null;
  finished_at: string | null;
  counts: Record<string, number> | null;
  error: string | null;
};

export function ImportRunsTableClient({ list }: { list: ImportRunRow[] }) {
  const columns: ColumnDef<ImportRunRow>[] = [
    {
      key: "started_at",
      label: "Data",
      type: "datetime",
      accessor: (r) => r.started_at,
      render: (r) => (r.started_at ? new Date(r.started_at).toLocaleString("pt-PT") : "—"),
    },
    {
      key: "source_type",
      label: "Tipo",
      type: "text",
      accessor: (r) => r.source_type,
      render: (r) => r.source_type,
    },
    {
      key: "tenant_nif",
      label: "Tenant NIF",
      type: "text",
      accessor: (r) => r.tenant_nif ?? "",
      render: (r) => r.tenant_nif ?? "—",
    },
    {
      key: "store_id",
      label: "Store ID",
      type: "text",
      accessor: (r) => r.store_id ?? "",
      render: (r) => <span className="text-slate-400 font-mono text-xs">{r.store_id?.slice(0, 8)}…</span>,
    },
    {
      key: "file_name",
      label: "Ficheiro",
      type: "text",
      accessor: (r) => r.file_name ?? "",
      render: (r) => r.file_name ?? "—",
    },
    {
      key: "counts",
      label: "Counts",
      type: "text",
      accessor: (r) => {
        const c = r.counts;
        return c ? `L:${c.read_rows ?? 0} U:${c.upserted ?? 0}` : "";
      },
      render: (r) => {
        const c = r.counts;
        return <span className="text-slate-300 text-xs">{c ? `L:${c.read_rows ?? 0} U:${c.upserted ?? 0} Up:${c.updated ?? 0} D:${c.discontinued ?? 0}` : "—"}</span>;
      },
    },
    {
      key: "error",
      label: "Erro",
      type: "text",
      accessor: (r) => r.error ?? "",
      render: (r) => <span className="text-red-300 text-xs max-w-[12rem] truncate block">{r.error ?? "—"}</span>,
    },
    {
      key: "detalhe",
      label: "Detalhe",
      type: "text",
      sortable: false,
      render: (r) => (
        <Link href={`/portal-admin/import/runs/${r.id}`} className="text-emerald-400 hover:text-emerald-300">
          Ver
        </Link>
      ),
    },
  ];

  return (
    <Card>
      <BwbTable<ImportRunRow>
        columns={columns}
        rows={list}
        rowKey={(r) => r.id}
        defaultSort={[{ key: "started_at", direction: "desc", type: "datetime" }]}
        tableClassName="text-sm"
      />
    </Card>
  );
}
