"use client";

import { BwbTable } from "@/components/admin";
import type { ColumnDef } from "@/lib/admin/bwbTableSort";

export type DomainTableRow = {
  id?: string;
  hostname: string;
  domain_type?: string;
  is_primary?: boolean;
};

function domainTypeLabel(domain_type?: string): string {
  if (domain_type === "default") return "Partilhado";
  if (domain_type === "custom") return "Privado";
  return domain_type ?? "—";
}

export function DomainsTableClient({
  rows,
  tableClassName = "",
  compact = false,
}: {
  rows: DomainTableRow[];
  tableClassName?: string;
  compact?: boolean;
}) {
  const thClass = compact ? "py-1 px-2 text-slate-400 text-sm" : "";
  const tdClass = compact ? "py-1 px-2 text-slate-200 text-sm" : "";
  const columns: ColumnDef<DomainTableRow>[] = [
    {
      key: "hostname",
      label: "Hostname",
      type: "text",
      accessor: (r) => r.hostname,
      render: (r) => r.hostname,
      headerClassName: thClass,
      cellClassName: tdClass,
    },
    {
      key: "domain_type",
      label: "Origem do Domínio",
      type: "text",
      accessor: (r) => domainTypeLabel(r.domain_type),
      render: (r) => domainTypeLabel(r.domain_type),
      headerClassName: thClass,
      cellClassName: tdClass,
    },
    {
      key: "is_primary",
      label: "Primário",
      type: "text",
      accessor: (r) => (r.is_primary ? "Sim" : "Não"),
      render: (r) => (r.is_primary ? "Sim" : "Não"),
      headerClassName: thClass,
      cellClassName: tdClass,
    },
  ];

  return (
    <BwbTable<DomainTableRow>
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id ?? r.hostname}
      defaultSort={[{ key: "hostname", direction: "asc", type: "text" }]}
      tableClassName={tableClassName}
    />
  );
}
