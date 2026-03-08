import { createClient } from "@/lib/supabase-server";
import { portalDebugLog } from "@/lib/portal-debug-log";
import Link from "next/link";
import { CreateStoreForm } from "./[tenantId]/stores/create-store-form";
import { StoreDomainsBlock } from "./store-domains-block";
import { StoresTableClient } from "./stores-table-client";
import { TenantContactEmailBlock } from "./tenant-contact-email-block";
import { Card } from "@/components/admin";

type TenantRow = { id: string; nif: string; name: string | null; contact_email?: string | null; created_at?: string };
type StoreRow = { id: string; tenant_id: string; store_number: number; name: string | null; source_type: string; is_active?: boolean };
type DomainRow = { hostname: string; is_primary?: boolean };

function normalizeTenantRow(row: unknown): TenantRow | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  const rawEmail = r.contact_email;
  const contact_email =
    typeof rawEmail === "string" && rawEmail.trim() !== "" ? rawEmail.trim() : null;
  return {
    id: r.id,
    nif: typeof r.nif === "string" ? r.nif : "",
    name: r.name != null ? String(r.name) : null,
    contact_email,
    created_at: r.created_at != null ? String(r.created_at) : undefined,
  };
}

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const supabase = await createClient();
  let list: TenantRow[] = [];
  try {
    const { data: raw } = await supabase.rpc("admin_list_tenants");
    const rawList = Array.isArray(raw) ? raw : [];
    list = rawList.map(normalizeTenantRow).filter((t): t is TenantRow => t !== null);
    if (process.env.PORTAL_DEBUG === "1" && rawList.length > 0) {
      const first = rawList[0] as Record<string, unknown>;
      portalDebugLog("tenants_page", {
        sampleKeys: Object.keys(first),
        hasContactEmailKey: "contact_email" in first,
      });
    }
  } catch (err) {
    console.error("TenantsPage admin_list_tenants:", err);
  }

  const tenantsWithStores = await Promise.all(
    list.map(async (t) => {
      const { data: storesRaw } = await supabase.rpc("admin_list_stores", { p_tenant_id: t.id });
      const stores: StoreRow[] = Array.isArray(storesRaw) ? (storesRaw as StoreRow[]) : [];
      const storesWithDomains = await Promise.all(
        stores.map(async (store) => {
          const { data: domainsRaw } = await supabase.rpc("admin_list_domains", { p_store_id: store.id });
          const domainsList: DomainRow[] = Array.isArray(domainsRaw) ? (domainsRaw as DomainRow[]) : [];
          return { store, domains: domainsList };
        })
      );
      return { tenant: t, storesWithDomains };
    })
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Tenants</h1>
      <p className="text-slate-400 mb-6">Listar tenants e respetivas lojas (Global Admin).</p>

      <div className="mb-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
        <Link
          href="/portal-admin/import/mappings"
          className="text-emerald-400 hover:text-emerald-300 font-medium"
        >
          Mapeamentos de importação (Excel → catálogo/menu)
        </Link>
        <p className="text-slate-500 text-sm mt-1">
          Configurar correspondência entre colunas dos ficheiros Excel e os campos do catálogo/menu.
        </p>
      </div>

      <section className="space-y-8">
        {tenantsWithStores.map(({ tenant: t, storesWithDomains }) => (
          <Card key={t.id} className="p-5">
            <div className="mb-4">
              <h2 className="text-lg font-medium text-slate-200">
                {t.nif} — {t.name ?? "—"}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                <Link href={`/portal-admin/tenants/${t.id}/stores`} className="text-emerald-400 hover:text-emerald-300">
                  Abrir lojas em página separada
                </Link>
              </p>
            </div>

            <TenantContactEmailBlock tenantId={t.id} initialEmail={t.contact_email ?? null} />

            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Adicionar loja</h3>
              <CreateStoreForm tenantId={t.id} tenantNif={t.nif} />
            </div>

            <h3 className="text-sm font-medium text-slate-300 mb-3">Lojas</h3>
            <StoresTableClient
              tenantId={t.id}
              storesWithDomains={storesWithDomains}
              showActionsColumn
            />
            {storesWithDomains.length === 0 && <p className="text-slate-500 py-4">Nenhuma loja.</p>}
            {storesWithDomains.map(({ store: s, domains }) => (
              <StoreDomainsBlock key={s.id} storeId={s.id} storeName={s.name} domains={domains} />
            ))}
          </Card>
        ))}
      </section>

      {list.length === 0 && (
        <Card className="p-5">
          <p className="text-slate-500">Nenhum tenant. Crie um em Definições.</p>
        </Card>
      )}
    </div>
  );
}
