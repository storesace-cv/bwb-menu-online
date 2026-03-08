"use client";

import Link from "next/link";
import { BwbTable } from "@/components/admin";
import type { ColumnDef } from "@/lib/admin/bwbTableSort";
import { StoreSourceTypeCell } from "./store-source-type-cell";
import { ClearStoreMenuButton } from "./clear-store-menu-button";

type StoreRow = { id: string; tenant_id: string; store_number: number; name: string | null; source_type: string; is_active?: boolean };
type DomainRow = { hostname: string; is_primary?: boolean };

export type StoreWithDomainsRow = { store: StoreRow; domains: DomainRow[] };

function formatDomains(domains: DomainRow[]): string {
  if (domains.length === 0) return "—";
  return domains
    .map((d) => (d.is_primary ? `${d.hostname} (primário)` : d.hostname))
    .join(", ");
}

export function StoresTableClient({
  tenantId,
  storesWithDomains,
  showActionsColumn = true,
}: {
  tenantId: string;
  storesWithDomains: StoreWithDomainsRow[];
  showActionsColumn?: boolean;
}) {
  const columns: ColumnDef<StoreWithDomainsRow>[] = [
    {
      key: "store_number",
      label: "Nº",
      type: "number",
      accessor: (r) => r.store.store_number,
      render: (r) => r.store.store_number,
    },
    {
      key: "name",
      label: "Nome da Loja",
      type: "text",
      accessor: (r) => r.store.name ?? "",
      render: (r) => r.store.name ?? "—",
    },
    {
      key: "source_type",
      label: "Origem dos Dados",
      type: "text",
      accessor: (r) => r.store.source_type,
      render: (r) => <StoreSourceTypeCell storeId={r.store.id} sourceType={r.store.source_type} />,
    },
    {
      key: "domains",
      label: "Domínio(s)",
      type: "text",
      accessor: (r) => formatDomains(r.domains),
      render: (r) => formatDomains(r.domains),
    },
    {
      key: "actions",
      label: "Ações",
      type: "text",
      sortable: false,
      render: (r) => (
        <span className="space-x-2">
          <Link
            href={`/portal-admin/tenants/${tenantId}/stores/${r.store.id}/domains`}
            className="text-emerald-400 hover:text-emerald-300"
          >
            Domínios
          </Link>
          {showActionsColumn && (
            <ClearStoreMenuButton storeId={r.store.id} storeName={r.store.name} />
          )}
        </span>
      ),
    },
  ];

  return (
    <BwbTable<StoreWithDomainsRow>
      columns={columns}
      rows={storesWithDomains}
      rowKey={(r) => r.store.id}
      defaultSort={[{ key: "store_number", direction: "asc", type: "number" }]}
    />
  );
}
