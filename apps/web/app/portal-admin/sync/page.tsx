import { Fragment } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { TriggerSyncButton } from "./trigger-sync-button";

export default async function SyncPage() {
  const headersList = await headers();
  const host = headersList.get("x-portal-host") ?? headersList.get("host") ?? "";
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    return (
      <div>
        <h1>Sync</h1>
        <p>Domínio não associado a nenhuma loja. Configure um domínio em Global Admin (Tenants → Lojas → Domínios).</p>
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
      <h1>Sync NET-bo</h1>
      <p>Sincronização de produtos a partir do NET-bo para o catálogo da loja. Configure a integração em Global Admin (Tenants → Lojas → Integração).</p>
      <p><Link href="/portal-admin/menu">← Menu</Link> · <Link href="/portal-admin/items">Itens</Link></p>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Disparar sync</h2>
        <TriggerSyncButton storeId={storeId} />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Histórico de syncs</h2>
        {(!runs || runs.length === 0) && <p style={{ color: "#666" }}>Nenhum sync executado ainda.</p>}
        {runs && runs.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>
                  <th style={{ padding: "0.5rem" }}>Run</th>
                  <th style={{ padding: "0.5rem" }}>Origem</th>
                  <th style={{ padding: "0.5rem" }}>Estado</th>
                  <th style={{ padding: "0.5rem" }}>Início</th>
                  <th style={{ padding: "0.5rem" }}>Fim</th>
                  <th style={{ padding: "0.5rem" }}>Contagens</th>
                  <th style={{ padding: "0.5rem" }}>Erro</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <Fragment key={run.id}>
                    <tr style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "0.5rem" }} title={run.id}>
                        {run.id.slice(0, 8)}…
                      </td>
                      <td style={{ padding: "0.5rem" }}>{run.source_type}</td>
                      <td style={{ padding: "0.5rem" }}>{run.status}</td>
                      <td style={{ padding: "0.5rem" }}>
                        {run.started_at ? new Date(run.started_at).toLocaleString() : "—"}
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        {run.finished_at ? new Date(run.finished_at).toLocaleString() : "—"}
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        {run.counts && typeof run.counts === "object" && !Array.isArray(run.counts)
                          ? `fetched: ${(run.counts as { fetched?: number }).fetched ?? "-"}, upserted: ${(run.counts as { upserted?: number }).upserted ?? "-"}, errors: ${(run.counts as { errors?: number }).errors ?? "-"}`
                          : "—"}
                      </td>
                      <td style={{ padding: "0.5rem", color: run.error ? "crimson" : undefined }}>
                        {run.error ? String(run.error).slice(0, 80) : "—"}
                      </td>
                    </tr>
                    {(eventsByRun[run.id]?.length ?? 0) > 0 && (
                      <tr style={{ borderBottom: "1px solid #eee", backgroundColor: "#f9f9f9" }}>
                        <td colSpan={7} style={{ padding: "0.5rem 0.5rem 0.5rem 1.5rem" }}>
                          <details>
                            <summary style={{ cursor: "pointer" }}>Eventos ({eventsByRun[run.id].length})</summary>
                            <ul style={{ margin: "0.25rem 0 0 1rem", paddingLeft: "1rem", fontSize: "0.85rem" }}>
                              {eventsByRun[run.id].map((ev, i) => (
                                <li key={i} style={{ color: ev.level === "error" ? "crimson" : undefined }}>
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
          </div>
        )}
      </section>
    </div>
  );
}
