import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { AddUserForm } from "./add-user-form";
import { AssignRoleForm } from "./assign-role-form";

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
      <h1>Utilizadores</h1>
      <p>Listar e atribuir utilizadores e roles (Global Admin).</p>
      <p><Link href="/portal-admin/tenants">← Tenants</Link></p>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Adicionar utilizador</h2>
        <AddUserForm tenants={tenants} storesByTenant={storesByTenant} roles={roles} />
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Atribuir role a utilizador existente</h2>
        <AssignRoleForm users={users} tenants={tenants} storesByTenant={storesByTenant} roles={roles} />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Lista</h2>
        <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "800px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Email</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Roles</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "0.5rem" }}>{u.email ?? "—"}</td>
                <td style={{ padding: "0.5rem" }}>
                  {u.bindings?.length
                    ? u.bindings.map((b) => (
                        <span key={`${b.role_code}-${b.tenant_id ?? ""}-${b.store_id ?? ""}`} style={{ display: "block" }}>
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
        {users.length === 0 && <p style={{ color: "#666" }}>Nenhum utilizador.</p>}
      </section>
    </div>
  );
}
