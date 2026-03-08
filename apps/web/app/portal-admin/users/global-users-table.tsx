"use client";

import { useRouter } from "next/navigation";
import { Card, BwbTable } from "@/components/admin";
import type { ColumnDef } from "@/lib/admin/bwbTableSort";
import { UserManageActions } from "./user-manage-actions";

type UserRow = {
  id: string;
  email: string | null;
  created_at: string;
  deleted_at: string | null;
  bindings: { role_code: string; tenant_id: string | null; tenant_name: string | null; store_id: string | null; store_name: string | null }[];
};

export function GlobalUsersTable({ users }: { users: UserRow[] }) {
  const router = useRouter();

  const columns: ColumnDef<UserRow>[] = [
    {
      key: "email",
      label: "Email",
      type: "text",
      accessor: (u) => u.email ?? "",
      render: (u) => u.email ?? "—",
    },
    {
      key: "roles",
      label: "Roles",
      type: "text",
      accessor: (u) =>
        u.bindings?.map((b) => `${b.role_code} ${b.tenant_name ?? ""} ${b.store_name ?? ""}`).join(" ") ?? "",
      render: (u) =>
        u.bindings?.length ? (
          u.bindings.map((b) => (
            <span key={`${b.role_code}-${b.tenant_id ?? ""}-${b.store_id ?? ""}`} className="block">
              {b.role_code}
              {b.tenant_name && ` (${b.tenant_name})`}
              {b.store_name && ` → ${b.store_name}`}
            </span>
          ))
        ) : (
          "—"
        ),
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
          onSuccess={() => router.refresh()}
        />
      ),
    },
  ];

  return (
    <Card>
      <BwbTable<UserRow>
        columns={columns}
        rows={users}
        rowKey={(u) => u.id}
        defaultSort={[{ key: "email", direction: "asc", type: "text" }]}
        getRowClassName={(u) => (u.deleted_at ? "opacity-70" : "")}
      />
      {users.length === 0 && <p className="text-slate-500 py-4">Nenhum utilizador.</p>}
    </Card>
  );
}
