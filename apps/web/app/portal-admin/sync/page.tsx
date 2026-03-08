import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import Link from "next/link";
import { TriggerSyncButton } from "./trigger-sync-button";
import { SyncRunsTableClient } from "./sync-runs-table-client";
import { Card } from "@/components/admin";

export default async function SyncPage() {
  const headersList = await headers();
  const host = getPortalHost(headersList);
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Sync</h1>
        <p className="text-slate-400">Domínio não associado a nenhuma loja. Configure um domínio em Global Admin (Tenants → Lojas → Domínios).</p>
      </div>
    );
  }

  const { data: runs } = await supabase
    .from("sync_runs")
    .select("id, store_id, source_type, status, started_at, finished_at, counts, error")
    .eq("store_id", storeId)
    .order("started_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Sync NET-bo</h1>
      <p className="text-slate-400 mb-2">Sincronização de produtos a partir do NET-bo para o catálogo da loja. Configure a integração em Definições.</p>
      <p className="mb-6">
        <Link href="/portal-admin/menu" className="text-emerald-400 hover:text-emerald-300">← Menu</Link>
        {" · "}
        <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">Definições</Link>
        {" · "}
        <Link href="/portal-admin/settings/items" className="text-emerald-400 hover:text-emerald-300">Gestão de Artigos</Link>
      </p>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Disparar sync</h2>
          <TriggerSyncButton storeId={storeId} />
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Histórico de syncs</h2>
        {(!runs || runs.length === 0) && <p className="text-slate-500">Nenhum sync executado ainda.</p>}
        {runs && runs.length > 0 && <SyncRunsTableClient runs={runs} />}
      </section>
    </div>
  );
}
