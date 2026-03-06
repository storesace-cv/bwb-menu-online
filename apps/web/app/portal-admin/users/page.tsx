import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { AddUserForm } from "./add-user-form";
import { AssignRoleForm } from "./assign-role-form";
import { Card, TableContainer } from "@/components/admin";

type UserRow = {
  id: string;
  email: string | null;
  created_at: string;
  bindings: { role_code: string; tenant_id: string | null; tenant_name: string | null; store_id: string | null; store_name: string | null }[];
};

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: usersRaw } = await supabase.rpc("admin_list_users");
  const users: UserRow[] = Array.isArray(usersRaw) ? usersRaw : [];

  const { data: tenantsRaw } = await supabase.rpc("admin_list_tenants");
  const tenants: { id: string; nif: string; name: string | null }[] = Array.isArray(tenantsRaw) ? tenantsRaw : [];

  const storesByTenant: Record<string, { id: string; store_number: number; name: string | null }[]> = {};
  for (const t of tenants) {
    const { data: storesRaw } = await supabase.rpc("admin_list_stores", { p_tenant_id: t.id });
    storesByTenant[t.id] = Array.isArray(storesRaw) ? storesRaw : [];
  }

  const roles = [
    { code: "superadmin", name: "Super Admin" },
    { code: "tenant_admin", name: "Tenant Admin" },
    { code: "store_editor", name: "Store Editor" },
    { code: "viewer", name: "Viewer" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Utilizadores</h1>
      <p className="text-slate-400 mb-2">Listar e atribuir utilizadores e roles (Global Admin).</p>
      <p className="mb-6">
        <Link href="/portal-admin/tenants" className="text-emerald-400 hover:text-emerald-300">← Tenants</Link>
      </p>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Adicionar utilizador</h2>
          <AddUserForm tenants={tenants} storesByTenant={storesByTenant} roles={roles} />
        </Card>
      </section>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Atribuir role a utilizador existente</h2>
          <AssignRoleForm users={users} tenants={tenants} storesByTenant={storesByTenant} roles={roles} />
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Lista</h2>
        <Card>
          <TableContainer>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-600">
                  <th className="text-left py-2 px-3 text-slate-300">Email</th>
                  <th className="text-left py-2 px-3 text-slate-300">Roles</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-700">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
          {users.length === 0 && <p className="text-slate-500 py-4">Nenhum utilizador.</p>}
        </Card>
      </section>
    </div>
  );
}
