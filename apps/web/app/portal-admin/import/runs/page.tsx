import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { ImportRunsTableClient } from "./import-runs-table-client";

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
        <ImportRunsTableClient list={list} />
      )}
    </div>
  );
}
