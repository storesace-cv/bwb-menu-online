import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { CreateStoreForm } from "./create-store-form";
import { Card, TableContainer } from "@/components/admin";

type Props = { params: Promise<{ tenantId: string }> };

type StoreRow = { id: string; tenant_id: string; store_number: number; name: string | null; source_type: string; is_active?: boolean };
type DomainRow = { hostname: string; is_primary?: boolean };

export default async function TenantStoresPage({ params }: Props) {
  const { tenantId } = await params;
  const supabase = await createClient();
  const { data: raw } = await supabase.rpc("admin_list_stores", { p_tenant_id: tenantId });
  const list: StoreRow[] = Array.isArray(raw) ? raw : [];

  const storesWithDomains = await Promise.all(
    list.map(async (store) => {
      const { data: domainsRaw } = await supabase.rpc("admin_list_domains", { p_store_id: store.id });
      const domainsList: DomainRow[] = Array.isArray(domainsRaw) ? (domainsRaw as DomainRow[]) : [];
      return { store, domains: domainsList };
    })
  );

  function formatDomains(domains: DomainRow[]): string {
    if (domains.length === 0) return "—";
    return domains
      .map((d) => (d.is_primary ? `${d.hostname} (primário)` : d.hostname))
      .join(", ");
  }

  return (
    <div>
      <p className="mb-4">
        <Link href="/portal-admin/tenants" className="text-emerald-400 hover:text-emerald-300">← Tenants</Link>
      </p>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Lojas do tenant</h1>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Adicionar loja</h2>
          <CreateStoreForm tenantId={tenantId} />
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Lista</h2>
        <Card>
          <TableContainer>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-600">
                  <th className="text-left py-2 px-3 text-slate-300">Nº</th>
                  <th className="text-left py-2 px-3 text-slate-300">Nome</th>
                  <th className="text-left py-2 px-3 text-slate-300">Source</th>
                  <th className="text-left py-2 px-3 text-slate-300">Domínio(s)</th>
                  <th className="text-left py-2 px-3 text-slate-300"></th>
                </tr>
              </thead>
              <tbody>
                {storesWithDomains.map(({ store: s, domains }) => (
                  <tr key={s.id} className="border-b border-slate-700">
                    <td className="py-2 px-3 text-slate-200">{s.store_number}</td>
                    <td className="py-2 px-3 text-slate-200">{s.name ?? "—"}</td>
                    <td className="py-2 px-3 text-slate-200">{s.source_type}</td>
                    <td className="py-2 px-3 text-slate-200">{formatDomains(domains)}</td>
                    <td className="py-2 px-3">
                      <Link href={`/portal-admin/tenants/${tenantId}/stores/${s.id}/domains`} className="text-emerald-400 hover:text-emerald-300">Domínios</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
          {storesWithDomains.length === 0 && <p className="text-slate-500 py-4">Nenhuma loja.</p>}
        </Card>
      </section>
    </div>
  );
}
