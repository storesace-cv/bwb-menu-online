"use client";

import { Card, BwbTable } from "@/components/admin";
import type { ColumnDef } from "@/lib/admin/bwbTableSort";

type SyncRunRow = {
  id: string;
  store_id: string;
  source_type: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  counts: { fetched?: number; upserted?: number; errors?: number } | null;
  error: string | null;
};

export function SyncRunsTableClient({ runs }: { runs: SyncRunRow[] }) {
  const columns: ColumnDef<SyncRunRow>[] = [
    {
      key: "id",
      label: "Run",
      type: "text",
      accessor: (r) => r.id,
      render: (r) => <span className="text-slate-200" title={r.id}>{r.id.slice(0, 8)}…</span>,
    },
    {
      key: "source_type",
      label: "Origem",
      type: "text",
      accessor: (r) => r.source_type,
      render: (r) => r.source_type,
    },
    {
      key: "status",
      label: "Estado",
      type: "text",
      accessor: (r) => r.status,
      render: (r) => r.status,
    },
    {
      key: "started_at",
      label: "Início",
      type: "datetime",
      accessor: (r) => r.started_at,
      render: (r) => (r.started_at ? new Date(r.started_at).toLocaleString() : "—"),
    },
    {
      key: "finished_at",
      label: "Fim",
      type: "datetime",
      accessor: (r) => r.finished_at,
      render: (r) => (r.finished_at ? new Date(r.finished_at).toLocaleString() : "—"),
    },
    {
      key: "counts",
      label: "Contagens",
      type: "text",
      accessor: (r) => {
        const c = r.counts;
        return c && typeof c === "object" && !Array.isArray(c)
          ? `fetched:${(c as { fetched?: number }).fetched ?? "-"} upserted:${(c as { upserted?: number }).upserted ?? "-"}`
          : "";
      },
      render: (r) => {
        const c = r.counts;
        return r.counts && typeof c === "object" && !Array.isArray(c)
          ? `fetched: ${(c as { fetched?: number }).fetched ?? "-"}, upserted: ${(c as { upserted?: number }).upserted ?? "-"}, errors: ${(c as { errors?: number }).errors ?? "-"}`
          : "—";
      },
    },
    {
      key: "error",
      label: "Erro",
      type: "text",
      accessor: (r) => r.error ?? "",
      render: (r) => (
        <span className={r.error ? "text-red-400" : "text-slate-200"}>
          {r.error ? String(r.error).slice(0, 80) : "—"}
        </span>
      ),
    },
  ];

  return (
    <Card>
      <BwbTable<SyncRunRow>
        columns={columns}
        rows={runs}
        rowKey={(r) => r.id}
        defaultSort={[{ key: "started_at", direction: "desc", type: "datetime" }]}
        tableClassName="text-sm"
      />
    </Card>
  );
}
