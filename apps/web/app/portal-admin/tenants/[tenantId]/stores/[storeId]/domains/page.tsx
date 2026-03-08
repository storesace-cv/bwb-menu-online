import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { SetDomainForm } from "./set-domain-form";
import { DomainsTableClient } from "../../../../domains-table-client";
import { Card } from "@/components/admin";

type Props = { params: Promise<{ tenantId: string; storeId: string }> };

export default async function StoreDomainsPage({ params }: Props) {
  const { tenantId, storeId } = await params;
  const supabase = await createClient();
  const { data: raw } = await supabase.rpc("admin_list_domains", { p_store_id: storeId });
  const list: { id: string; store_id: string; hostname: string; domain_type: string; is_primary: boolean }[] =
    Array.isArray(raw) ? raw : [];

  return (
    <div>
      <p className="mb-4 text-slate-400">
        <Link href="/portal-admin/tenants" className="text-emerald-400 hover:text-emerald-300">Tenants</Link>
        {" → "}
        <Link href={`/portal-admin/tenants/${tenantId}/stores`} className="text-emerald-400 hover:text-emerald-300">Lojas</Link>
        {" → Domínios"}
      </p>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Domínios da loja</h1>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Definir domínio</h2>
          <SetDomainForm storeId={storeId} />
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Lista</h2>
        <Card>
          <DomainsTableClient rows={list} />
          {list.length === 0 && <p className="text-slate-500 py-4">Nenhum domínio.</p>}
        </Card>
      </section>
    </div>
  );
}
