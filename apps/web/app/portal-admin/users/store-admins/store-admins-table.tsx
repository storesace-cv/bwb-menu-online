"use client";

import { Card, BwbTable } from "@/components/admin";
import type { ColumnDef } from "@/lib/admin/bwbTableSort";
import { UserManageActions } from "../user-manage-actions";

type StoreAdminRow = {
  id: string;
  email: string | null;
  created_at: string;
  deleted_at?: string | null;
  bindings: { role_code: string; store_id: string | null; store_name: string | null }[];
};

export function StoreAdminsTable({ list }: { list: StoreAdminRow[] }) {
  function onSuccess() {
    window.dispatchEvent(new CustomEvent("store-admins-refresh"));
  }

  const columns: ColumnDef<StoreAdminRow>[] = [
    {
      key: "email",
      label: "Email",
      type: "text",
      accessor: (u) => u.email ?? "",
      render: (u) => u.email ?? "—",
    },
    {
      key: "lojas",
      label: "Lojas associadas",
      type: "text",
      accessor: (u) =>
        u.bindings?.map((b) => b.store_name ?? b.store_id ?? "—").join(", ") ?? "",
      render: (u) =>
        u.bindings?.length
          ? u.bindings.map((b) => b.store_name ?? b.store_id ?? "—").join(", ")
          : "—",
    },
    {
      key: "gerir",
      label: "Gerir",
      type: "text",
      sortable: false,
      render: (u) => (
        <UserManageActions
          userId={u.id}
          deletedAt={u.deleted_at ?? null}
          onSuccess={onSuccess}
        />
      ),
    },
  ];

  return (
    <Card>
      <BwbTable<StoreAdminRow>
        columns={columns}
        rows={list}
        rowKey={(u) => u.id}
        defaultSort={[{ key: "email", direction: "asc", type: "text" }]}
        getRowClassName={(u) => (u.deleted_at ? "opacity-70" : "")}
      />
      {list.length === 0 && <p className="text-slate-500 py-4">Nenhum admin de loja.</p>}
    </Card>
  );
}
