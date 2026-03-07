import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getPortalMode } from "@/lib/portal-mode";
import Link from "next/link";
import { AddUserForm } from "./add-user-form";
import { AssignRoleForm } from "./assign-role-form";
import { StoreUsersForm } from "./store-users-form";
import { StoreUsersTable } from "./store-users-table";
import { RefreshOnStoreUsersEvent } from "./refresh-store-users";
import { Card, TableContainer } from "@/components/admin";

type UserRow = {
  id: string;
  email: string | null;
  created_at: string;
  bindings: { role_code: string; tenant_id: string | null; tenant_name: string | null; store_id: string | null; store_name: string | null }[];
};

type StoreUserRow = {
  id: string;
  email: string | null;
  created_at: string;
  store_id: string;
  store_name: string | null;
};

export default async function UsersPage() {
  const headersList = await headers();
  const host = headersList.get("host") ?? headersList.get("x-forwarded-host") ?? "";
  const pathname = headersList.get("x-pathname") ?? "/portal-admin/users";
  const mode = getPortalMode(host, pathname);

  const supabase = await createClient();

  if (mode === "tenant") {
    const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });
    if (!storeId) {
      return (
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 mb-2">Utilizadores</h1>
          <p className="text-slate-400">Loja não encontrada para este domínio.</p>
        </div>
      );
    }
    const { data: canAccess } = await supabase.rpc("current_user_can_access_settings", { p_store_id: storeId });
    if (!canAccess) {
      return (
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 mb-2">Utilizadores</h1>
          <p className="text-slate-400">Sem permissão para gerir utilizadores desta loja.</p>
        </div>
      );
    }
    const { data: storeUsersRaw } = await supabase.rpc("admin_list_users_by_role_for_store", {
      p_role_code: "store_user",
      p_store_id: storeId,
    });
    const storeUsers: StoreUserRow[] = Array.isArray(storeUsersRaw) ? storeUsersRaw : [];

    return (
      <div>
        <RefreshOnStoreUsersEvent />
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Utilizadores da loja</h1>
        <p className="text-slate-400 mb-6">Criar e gerir utilizadores com acesso a esta loja (role Utilizador de Loja).</p>

        <section className="mb-8">
          <StoreUsersForm />
        </section>

        <section>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Lista</h2>
          <StoreUsersTable list={storeUsers} />
        </section>
      </div>
    );
  }

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
        {" · "}
        <Link href="/portal-admin/users/store-admins" className="text-emerald-400 hover:text-emerald-300">Admins de Loja</Link>
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
