import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { ImportMappingsTable, type MappingRow } from "./import-mappings-table";
import { Card } from "@/components/admin";

export const dynamic = "force-dynamic";

export default async function ImportMappingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div>
        <p className="text-slate-400">
          Sessão inválida. <Link href="/portal-admin/login" className="text-emerald-400 hover:underline">Iniciar sessão</Link>.
        </p>
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

  const { data: raw, error } = await supabase.rpc("admin_list_import_field_mappings", {
    p_source_type: null,
  });
  const rows: MappingRow[] = Array.isArray(raw)
    ? raw.map((r: Record<string, unknown>) => ({
        id: String(r.id),
        source_type: String(r.source_type ?? ""),
        source_field: String(r.source_field ?? ""),
        target_field: String(r.target_field ?? ""),
        transform: (r.transform as { type?: string }) ?? { type: "copy" },
        is_active: r.is_active === true,
      }))
    : [];

  return (
    <div>
      <nav className="mb-2 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li>
            <Link href="/portal-admin" className="hover:text-slate-200 transition-colors">Portal Admin</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/portal-admin/tenants" className="hover:text-slate-200 transition-colors">Tenants</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-100" aria-current="page">Mapeamentos de importação</li>
        </ol>
      </nav>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Mapeamentos de importação (Excel → catálogo/menu)</h1>
      <p className="text-slate-400 mb-6">
        Configure a correspondência entre colunas dos ficheiros Excel (excel_netbo, excel_zsbms) e os campos do catálogo/menu.
        A aplicação destes mapeamentos ao importar está planeada para uma fase posterior.
      </p>

      {error ? (
        <p className="text-red-300">{error.message}</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500">Nenhum mapeamento configurado.</p>
      ) : (
        <Card className="p-5">
          <ImportMappingsTable rows={rows} />
        </Card>
      )}
    </div>
  );
}
