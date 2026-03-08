import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/admin";

export const dynamic = "force-dynamic";

export default async function ImportRunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
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

  const { data: run, error } = await supabase
    .from("import_runs")
    .select("*")
    .eq("id", runId)
    .single();
  if (error || !run) {
    notFound();
  }

  const counts = (run.counts as Record<string, number>) ?? {};

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
          <li>
            <Link href="/portal-admin/import/runs" className="hover:text-slate-200 transition-colors">Import runs</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-100" aria-current="page">{runId.slice(0, 8)}…</li>
        </ol>
      </nav>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Import run</h1>

      <Card className="p-5 space-y-3">
        <p><span className="text-slate-400">ID:</span> <span className="text-slate-200 font-mono text-sm">{run.id}</span></p>
        <p><span className="text-slate-400">Tipo:</span> <span className="text-slate-200">{run.source_type}</span></p>
        <p><span className="text-slate-400">Tenant NIF:</span> <span className="text-slate-200">{run.tenant_nif}</span></p>
        <p><span className="text-slate-400">Store ID:</span> <span className="text-slate-200 font-mono text-sm">{run.store_id}</span></p>
        <p><span className="text-slate-400">Ficheiro:</span> <span className="text-slate-200">{run.file_name ?? "—"}</span></p>
        <p><span className="text-slate-400">File hash:</span> <span className="text-slate-200 font-mono text-xs break-all">{run.file_hash ?? "—"}</span></p>
        <p><span className="text-slate-400">Início:</span> <span className="text-slate-200">{run.started_at ? new Date(run.started_at).toLocaleString("pt-PT") : "—"}</span></p>
        <p><span className="text-slate-400">Fim:</span> <span className="text-slate-200">{run.finished_at ? new Date(run.finished_at).toLocaleString("pt-PT") : "—"}</span></p>
        <div>
          <span className="text-slate-400 block mb-1">Counts:</span>
          <pre className="text-slate-200 text-sm bg-slate-800 p-3 rounded overflow-auto">
            {JSON.stringify(counts, null, 2)}
          </pre>
        </div>
        {run.error && (
          <p><span className="text-slate-400">Erro:</span> <span className="text-red-300">{run.error}</span></p>
        )}
      </Card>
    </div>
  );
}
