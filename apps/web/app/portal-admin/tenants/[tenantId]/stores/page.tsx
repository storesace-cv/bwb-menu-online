import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { CreateStoreForm } from "./create-store-form";
import { StoresTableClient } from "../../stores-table-client";
import { Card } from "@/components/admin";

type Props = { params: Promise<{ tenantId: string }> };

type StoreRow = { id: string; tenant_id: string; store_number: number; name: string | null; source_type: string; is_active?: boolean };
type DomainRow = { hostname: string; is_primary?: boolean };

export default async function TenantStoresPage({ params }: Props) {
  const { tenantId } = await params;
  const supabase = await createClient();
  const { data: tenantRow } = await supabase.from("tenants").select("nif").eq("id", tenantId).single();
  const tenantNif = (tenantRow?.nif ?? "").trim();
  const { data: raw } = await supabase.rpc("admin_list_stores", { p_tenant_id: tenantId });
  const list: StoreRow[] = Array.isArray(raw) ? raw : [];

  const storesWithDomains = await Promise.all(
    list.map(async (store) => {
      const { data: domainsRaw } = await supabase.rpc("admin_list_domains", { p_store_id: store.id });
      const domainsList: DomainRow[] = Array.isArray(domainsRaw) ? (domainsRaw as DomainRow[]) : [];
      return { store, domains: domainsList };
    })
  );

  return (
    <div>
      <p className="mb-4">
        <Link href="/portal-admin/tenants" className="text-emerald-400 hover:text-emerald-300">← Tenants</Link>
      </p>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Lojas do tenant</h1>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Adicionar loja</h2>
          <CreateStoreForm tenantId={tenantId} tenantNif={tenantNif} />
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Lista</h2>
        <Card>
          <StoresTableClient
            tenantId={tenantId}
            storesWithDomains={storesWithDomains}
            showActionsColumn={false}
          />
          {storesWithDomains.length === 0 && <p className="text-slate-500 py-4">Nenhuma loja.</p>}
        </Card>
      </section>
    </div>
  );
}
