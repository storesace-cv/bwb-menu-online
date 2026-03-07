"use client";

import { useRouter } from "next/navigation";
import { Card, TableContainer } from "@/components/admin";
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
  return (
    <Card>
      <TableContainer>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-600">
              <th className="text-left py-2 px-3 text-slate-300">Email</th>
              <th className="text-left py-2 px-3 text-slate-300">Roles</th>
              <th className="text-left py-2 px-3 text-slate-300">Gerir</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={`border-b border-slate-700 ${u.deleted_at ? "opacity-70" : ""}`}>
                <td className="py-2 px-3 text-slate-200">{u.email ?? "—"}</td>
                <td className="py-2 px-3 text-slate-200">
                  {u.bindings?.length
                    ? u.bindings.map((b) => (
                        <span key={`${b.role_code}-${b.tenant_id ?? ""}-${b.store_id ?? ""}`} className="block">
                          {b.role_code}
                          {b.tenant_name && ` (${b.tenant_name})`}
                          {b.store_name && ` → ${b.store_name}`}
                        </span>
                      ))
                    : "—"}
                </td>
                <td className="py-2 px-3">
                  <UserManageActions
                    userId={u.id}
                    deletedAt={u.deleted_at}
                    onSuccess={() => router.refresh()}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableContainer>
      {users.length === 0 && <p className="text-slate-500 py-4">Nenhum utilizador.</p>}
    </Card>
  );
}
