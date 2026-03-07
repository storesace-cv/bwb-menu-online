import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getPortalMode } from "@/lib/portal-mode";
import Link from "next/link";
import { AddUserForm } from "./add-user-form";
import { AssignRoleForm } from "./assign-role-form";
import { StoreUsersForm } from "./store-users-form";
import { StoreUsersTable } from "./store-users-table";
import { RefreshOnStoreUsersEvent } from "./refresh-store-users";
import { RolesInfoCard } from "./roles-info-card";
import { GlobalUsersTable } from "./global-users-table";
import { Card } from "@/components/admin";

type UserRow = {
  id: string;
  email: string | null;
  created_at: string;
  deleted_at: string | null;
  bindings: { role_code: string; tenant_id: string | null; tenant_name: string | null; store_id: string | null; store_name: string | null }[];
};

type StoreUserRow = {
  id: string;
  email: string | null;
  created_at: string;
  deleted_at?: string | null;
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

        <section className="mb-8">
          <RolesInfoCard
            roles={[
              { code: "store_user", name: "Utilizador de Loja", description: "Acesso ao portal da loja (menu, artigos). Não pode aceder ao menu Definições nem gerir outros utilizadores." },
              { code: "store_admin", name: "Admin de Loja", description: "Acesso total ao portal da loja, incluindo Definições e gestão de utilizadores. Pode criar e gerir utilizadores da loja." },
            ]}
          />
        </section>

        <section>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Lista</h2>
          <StoreUsersTable list={storeUsers} storeId={storeId} />
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
    { code: "store_admin", name: "Admin de Loja" },
    { code: "store_user", name: "Utilizador de Loja" },
  ];

  const rolesWithDescriptions = [
    { code: "superadmin", name: "Super Admin", description: "Acesso total ao portal global (menu.bwb.pt). Pode gerir tenants, lojas, utilizadores e atribuir qualquer perfil." },
    { code: "tenant_admin", name: "Tenant Admin", description: "Administrador do tenant. Acesso às lojas do tenant." },
    { code: "store_editor", name: "Store Editor", description: "Editor de conteúdo da loja (menu, itens)." },
    { code: "viewer", name: "Viewer", description: "Apenas visualização na loja." },
    { code: "store_admin", name: "Admin de Loja", description: "Admin da loja. Acesso total ao portal da loja, incluindo Definições e gestão de utilizadores da loja." },
    { code: "store_user", name: "Utilizador de Loja", description: "Utilizador da loja. Acesso ao portal da loja exceto ao menu Definições." },
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

      <section className="mb-8">
        <RolesInfoCard roles={rolesWithDescriptions} />
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Lista</h2>
        <GlobalUsersTable users={users} />
      </section>
    </div>
  );
}
