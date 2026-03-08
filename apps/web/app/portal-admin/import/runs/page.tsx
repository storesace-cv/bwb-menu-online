import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Card, TableContainer } from "@/components/admin";

export const dynamic = "force-dynamic";

export default async function ImportRunsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div>
        <p className="text-slate-400">Sessão inválida. <Link href="/portal-admin/login" className="text-emerald-400 hover:underline">Iniciar sessão</Link>.</p>
      </div>
    );
  }
  const { data: isSuper } = await supabase.rpc("current_user_is_superadmin");
  if (!isSuper) {
    return (
      <div>
        <p className="text-slate-400">Acesso reservado a superadmin.</p>
      </div>
    );
  }

  const { data: runs, error } = await supabase
    .from("import_runs")
    .select("id, source_type, tenant_nif, store_id, file_name, started_at, finished_at, counts, error")
    .order("started_at", { ascending: false })
    .limit(100);
  const list = runs ?? [];

  return (
    <div>
      <nav className="mb-2 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li>
            <Link href="/portal-admin" className="hover:text-slate-200 transition-colors">Portal Admin</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/portal-admin/menu" className="hover:text-slate-200 transition-colors">Menu</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-100" aria-current="page">Import runs</li>
        </ol>
      </nav>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Import runs</h1>
      <p className="text-slate-400 mb-6">Histórico de importações Excel (excel_netbo, excel_zsbms).</p>

      {error ? (
        <p className="text-red-300">{error.message}</p>
      ) : list.length === 0 ? (
        <p className="text-slate-500">Nenhum import run.</p>
      ) : (
        <Card>
          <TableContainer>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-3 text-slate-300 font-medium">Data</th>
                  <th className="text-left py-2 px-3 text-slate-300 font-medium">Tipo</th>
                  <th className="text-left py-2 px-3 text-slate-300 font-medium">Tenant NIF</th>
                  <th className="text-left py-2 px-3 text-slate-300 font-medium">Store ID</th>
                  <th className="text-left py-2 px-3 text-slate-300 font-medium">Ficheiro</th>
                  <th className="text-left py-2 px-3 text-slate-300 font-medium">Counts</th>
                  <th className="text-left py-2 px-3 text-slate-300 font-medium">Erro</th>
                  <th className="text-left py-2 px-3 text-slate-300 font-medium">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const counts = r.counts as Record<string, number> | null;
                  const countStr = counts
                    ? `L:${counts.read_rows ?? 0} U:${counts.upserted ?? 0} Up:${counts.updated ?? 0} D:${counts.discontinued ?? 0}`
                    : "—";
                  return (
                    <tr key={r.id} className="border-b border-slate-700/50">
                      <td className="py-2 px-3 text-slate-200">
                        {r.started_at ? new Date(r.started_at).toLocaleString("pt-PT") : "—"}
                      </td>
                      <td className="py-2 px-3 text-slate-200">{r.source_type}</td>
                      <td className="py-2 px-3 text-slate-200">{r.tenant_nif}</td>
                      <td className="py-2 px-3 text-slate-400 font-mono text-xs">{r.store_id?.slice(0, 8)}…</td>
                      <td className="py-2 px-3 text-slate-200">{r.file_name ?? "—"}</td>
                      <td className="py-2 px-3 text-slate-300 text-xs">{countStr}</td>
                      <td className="py-2 px-3 text-red-300 text-xs max-w-[12rem] truncate">{r.error ?? "—"}</td>
                      <td className="py-2 px-3">
                        <Link href={`/portal-admin/import/runs/${r.id}`} className="text-emerald-400 hover:text-emerald-300">
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableContainer>
        </Card>
      )}
    </div>
  );
}
