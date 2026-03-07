"use client";

import { Card, TableContainer } from "@/components/admin";
import { UserManageActions } from "./user-manage-actions";

type StoreUserRow = {
  id: string;
  email: string | null;
  created_at: string;
  deleted_at?: string | null;
  store_id: string;
  store_name: string | null;
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
  const rows = Array.from(byUser.entries()).map(([, rows]) => ({
    id: rows[0]!.id,
    email: rows[0]!.email,
    created_at: rows[0]!.created_at,
    deleted_at: rows[0]!.deleted_at ?? null,
    stores: rows.map((r) => r.store_name ?? r.store_id).join(", "),
  }));

  return (
    <Card>
      <TableContainer>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-600">
              <th className="text-left py-2 px-3 text-slate-300">Email</th>
              <th className="text-left py-2 px-3 text-slate-300">Lojas</th>
              <th className="text-left py-2 px-3 text-slate-300">Gerir</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className={`border-b border-slate-700 ${u.deleted_at ? "opacity-70" : ""}`}>
                <td className="py-2 px-3 text-slate-200">{u.email ?? "—"}</td>
                <td className="py-2 px-3 text-slate-200">{u.stores}</td>
                <td className="py-2 px-3">
                  <UserManageActions
                    userId={u.id}
                    deletedAt={u.deleted_at}
                    onSuccess={onSuccess}
                    storeId={storeId}
                    context={storeId ? "store_users" : undefined}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableContainer>
      {rows.length === 0 && <p className="text-slate-500 py-4">Nenhum utilizador desta loja.</p>}
    </Card>
  );
}
