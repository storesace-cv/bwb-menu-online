import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { StoreAdminsForm } from "./store-admins-form";
import { StoreAdminsTable } from "./store-admins-table";
import { RefreshOnStoreAdminsEvent } from "./refresh-on-event";
import type { MultiSelectOption } from "@/components/admin";

type StoreAdminRow = {
  id: string;
  email: string | null;
  created_at: string;
  bindings: { role_code: string; store_id: string | null; store_name: string | null }[];
};

export default async function StoreAdminsPage() {
  const supabase = await createClient();
  const { data: isSuper } = await supabase.rpc("current_user_is_superadmin");
  if (!isSuper) {
    return (
      <div>
        <p className="text-slate-400">Acesso reservado a superadmin.</p>
      </div>
    );
  }

  const { data: raw } = await supabase.rpc("admin_list_users");
  const all: StoreAdminRow[] = Array.isArray(raw) ? raw : [];
  const storeAdmins = all
    .map((u) => ({
      ...u,
      bindings: (u.bindings || []).filter((b: { role_code: string }) => b.role_code === "store_admin"),
    }))
    .filter((u) => u.bindings.length > 0);

  const { data: tenantsRaw } = await supabase.rpc("admin_list_tenants");
  const tenants: { id: string; nif: string; name: string | null }[] = Array.isArray(tenantsRaw) ? tenantsRaw : [];
  const storesByTenant: Record<string, { id: string; store_number: number; name: string | null }[]> = {};
  for (const t of tenants) {
    const { data: storesRaw } = await supabase.rpc("admin_list_stores", { p_tenant_id: t.id });
    storesByTenant[t.id] = Array.isArray(storesRaw) ? storesRaw : [];
  }
  const storeOptions: MultiSelectOption[] = [];
  for (const t of tenants) {
    for (const s of storesByTenant[t.id] ?? []) {
      storeOptions.push({
        id: s.id,
        label: `${t.name ?? t.nif} – ${s.name ?? s.store_number}`,
      });
    }
  }

  return (
    <div>
      <RefreshOnStoreAdminsEvent />
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Admins de Loja</h1>
      <p className="text-slate-400 mb-2">Criar e gerir utilizadores com role Admin de Loja (acesso a Definições e Utilizadores da loja).</p>
      <p className="mb-6">
        <Link href="/portal-admin/users" className="text-emerald-400 hover:text-emerald-300">← Utilizadores</Link>
      </p>

      <section className="mb-8">
        <StoreAdminsForm storeOptions={storeOptions} />
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Lista</h2>
        <StoreAdminsTable list={storeAdmins} />
      </section>
    </div>
  );
}
