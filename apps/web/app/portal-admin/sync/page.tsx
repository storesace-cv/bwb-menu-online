import { Fragment } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { TriggerSyncButton } from "./trigger-sync-button";
import { Card, TableContainer } from "@/components/admin";

export default async function SyncPage() {
  const headersList = await headers();
  const host = headersList.get("x-portal-host") ?? headersList.get("host") ?? "";
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

  const runIds = (runs ?? []).map((r) => r.id);
  let eventsByRun: Record<string, { level: string; message: string | null; created_at: string }[]> = {};
  if (runIds.length > 0) {
    const { data: events } = await supabase
      .from("sync_events")
      .select("run_id, level, message, created_at")
      .in("run_id", runIds)
      .order("created_at", { ascending: true });
    for (const e of events ?? []) {
      const list = eventsByRun[e.run_id] ?? [];
      list.push({ level: e.level, message: e.message, created_at: e.created_at });
      eventsByRun[e.run_id] = list;
    }
  }

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
        {runs && runs.length > 0 && (
          <Card>
            <TableContainer>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-600 text-left">
                    <th className="py-2 px-3 text-slate-300">Run</th>
                    <th className="py-2 px-3 text-slate-300">Origem</th>
                    <th className="py-2 px-3 text-slate-300">Estado</th>
                    <th className="py-2 px-3 text-slate-300">Início</th>
                    <th className="py-2 px-3 text-slate-300">Fim</th>
                    <th className="py-2 px-3 text-slate-300">Contagens</th>
                    <th className="py-2 px-3 text-slate-300">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <Fragment key={run.id}>
                      <tr className="border-b border-slate-700">
                        <td className="py-2 px-3 text-slate-200" title={run.id}>
                          {run.id.slice(0, 8)}…
                        </td>
                        <td className="py-2 px-3 text-slate-200">{run.source_type}</td>
                        <td className="py-2 px-3 text-slate-200">{run.status}</td>
                        <td className="py-2 px-3 text-slate-200">
                          {run.started_at ? new Date(run.started_at).toLocaleString() : "—"}
                        </td>
                        <td className="py-2 px-3 text-slate-200">
                          {run.finished_at ? new Date(run.finished_at).toLocaleString() : "—"}
                        </td>
                        <td className="py-2 px-3 text-slate-200">
                          {run.counts && typeof run.counts === "object" && !Array.isArray(run.counts)
                            ? `fetched: ${(run.counts as { fetched?: number }).fetched ?? "-"}, upserted: ${(run.counts as { upserted?: number }).upserted ?? "-"}, errors: ${(run.counts as { errors?: number }).errors ?? "-"}`
                            : "—"}
                        </td>
                        <td className={`py-2 px-3 ${run.error ? "text-red-400" : "text-slate-200"}`}>
                          {run.error ? String(run.error).slice(0, 80) : "—"}
                        </td>
                      </tr>
                      {(eventsByRun[run.id]?.length ?? 0) > 0 && (
                        <tr className="border-b border-slate-700 bg-slate-800/50">
                          <td colSpan={7} className="py-2 px-3 pl-6">
                            <details>
                              <summary className="cursor-pointer text-slate-300">Eventos ({eventsByRun[run.id].length})</summary>
                              <ul className="mt-1 ml-4 list-disc text-slate-400 text-xs space-y-0.5">
                                {eventsByRun[run.id].map((ev, i) => (
                                  <li key={i} className={ev.level === "error" ? "text-red-400" : ""}>
                                    [{ev.level}] {ev.message ?? ""} — {new Date(ev.created_at).toLocaleString()}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          </Card>
        )}
      </section>
    </div>
  );
}
