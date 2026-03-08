import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { CreateStoreForm } from "./[tenantId]/stores/create-store-form";
import { ClearStoreMenuButton } from "./clear-store-menu-button";
import { StoreDomainsBlock } from "./store-domains-block";
import { StoreSourceTypeCell } from "./store-source-type-cell";
import { TenantContactEmailBlock } from "./tenant-contact-email-block";
import { Card, TableContainer } from "@/components/admin";

type TenantRow = { id: string; nif: string; name: string | null; contact_email?: string | null; created_at?: string };
type StoreRow = { id: string; tenant_id: string; store_number: number; name: string | null; source_type: string; is_active?: boolean };
type DomainRow = { hostname: string; is_primary?: boolean };

function formatDomains(domains: DomainRow[]): string {
  if (domains.length === 0) return "—";
  return domains
    .map((d) => (d.is_primary ? `${d.hostname} (primário)` : d.hostname))
    .join(", ");
}

export default async function TenantsPage() {
  const supabase = await createClient();
  const { data: raw } = await supabase.rpc("admin_list_tenants");
  const list: TenantRow[] = Array.isArray(raw) ? raw : [];

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
            <TableContainer>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-600">
                    <th className="text-left py-2 px-3 text-slate-300">Nº</th>
                    <th className="text-left py-2 px-3 text-slate-300">Nome da Loja</th>
                    <th className="text-left py-2 px-3 text-slate-300">Origem dos Dados</th>
                    <th className="text-left py-2 px-3 text-slate-300">Domínio(s)</th>
                    <th className="text-left py-2 px-3 text-slate-300">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {storesWithDomains.map(({ store: s, domains }) => (
                    <tr key={s.id} className="border-b border-slate-700">
                      <td className="py-2 px-3 text-slate-200">{s.store_number}</td>
                      <td className="py-2 px-3 text-slate-200">{s.name ?? "—"}</td>
                      <td className="py-2 px-3 text-slate-200">
                        <StoreSourceTypeCell storeId={s.id} sourceType={s.source_type} />
                      </td>
                      <td className="py-2 px-3 text-slate-200">{formatDomains(domains)}</td>
                      <td className="py-2 px-3 space-x-2">
                        <Link
                          href={`/portal-admin/tenants/${t.id}/stores/${s.id}/domains`}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          Domínios
                        </Link>
                        <ClearStoreMenuButton storeId={s.id} storeName={s.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
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
