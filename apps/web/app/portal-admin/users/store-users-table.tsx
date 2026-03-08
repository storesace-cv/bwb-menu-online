"use client";

import { Card, BwbTable } from "@/components/admin";
import type { ColumnDef } from "@/lib/admin/bwbTableSort";
import { UserManageActions } from "./user-manage-actions";

type StoreUserRow = {
  id: string;
  email: string | null;
  created_at: string;
  deleted_at?: string | null;
  store_id: string;
  store_name: string | null;
};

type AggregatedRow = {
  id: string;
  email: string | null;
  created_at: string;
  deleted_at: string | null;
  stores: string;
};

export function StoreUsersTable({ list, storeId }: { list: StoreUserRow[]; storeId?: string }) {
  function onSuccess() {
    window.dispatchEvent(new CustomEvent("store-users-refresh"));
  }

  const byUser = new Map<string | null, StoreUserRow[]>();
  for (const row of list) {
    const key = row.email ?? row.id;
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key)!.push(row);
  }
  const rows: AggregatedRow[] = Array.from(byUser.entries()).map(([, rows]) => ({
    id: rows[0]!.id,
    email: rows[0]!.email,
    created_at: rows[0]!.created_at,
    deleted_at: rows[0]!.deleted_at ?? null,
    stores: rows.map((r) => r.store_name ?? r.store_id).join(", "),
  }));

  const columns: ColumnDef<AggregatedRow>[] = [
    {
      key: "email",
      label: "Email",
      type: "text",
      accessor: (u) => u.email ?? "",
      render: (u) => u.email ?? "—",
    },
    {
      key: "stores",
      label: "Lojas",
      type: "text",
      accessor: (u) => u.stores,
      render: (u) => u.stores,
    },
    {
      key: "gerir",
      label: "Gerir",
      type: "text",
      sortable: false,
      render: (u) => (
        <UserManageActions
          userId={u.id}
          deletedAt={u.deleted_at}
          onSuccess={onSuccess}
          storeId={storeId}
          context={storeId ? "store_users" : undefined}
        />
      ),
    },
  ];

  return (
    <Card>
      <BwbTable<AggregatedRow>
        columns={columns}
        rows={rows}
        rowKey={(u) => u.id}
        defaultSort={[{ key: "email", direction: "asc", type: "text" }]}
        getRowClassName={(u) => (u.deleted_at ? "opacity-70" : "")}
      />
      {rows.length === 0 && <p className="text-slate-500 py-4">Nenhum utilizador desta loja.</p>}
    </Card>
  );
}
