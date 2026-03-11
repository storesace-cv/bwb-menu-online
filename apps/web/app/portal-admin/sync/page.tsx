import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import Link from "next/link";
import { TriggerSyncButton } from "./trigger-sync-button";
import { SyncRunsTableClient } from "./sync-runs-table-client";
import { ExcelImportForStore } from "./excel-import-for-store";
import { RestoreBackupButton } from "./restore-backup-button";
import { Card } from "@/components/admin";

const EXCEL_SOURCE_TYPES = ["excel_netbo", "excel_zsbms"];

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

  const { data: storeRow } = await supabase
    .from("stores")
    .select("source_type, tenant_id")
    .eq("id", storeId)
    .single();

  const sourceType = (storeRow as { source_type?: string } | null)?.source_type ?? "";
  const tenantId = (storeRow as { tenant_id?: string } | null)?.tenant_id ?? null;

  let tenantNif = "";
  if (tenantId) {
    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("nif")
      .eq("id", tenantId)
      .single();
    tenantNif = (tenantRow as { nif?: string } | null)?.nif ?? "";
  }

  const isExcelOrigin = EXCEL_SOURCE_TYPES.includes(sourceType);

  const { data: runs } = await supabase
    .from("sync_runs")
    .select("id, store_id, source_type, status, started_at, finished_at, counts, error")
    .eq("store_id", storeId)
    .order("started_at", { ascending: false })
    .limit(50);

  const { data: backupRow } = await supabase
    .from("store_sync_backups")
    .select("created_at, backup_type")
    .eq("store_id", storeId)
    .single();

  const navLinks = (
    <p className="mb-6">
      <Link href="/portal-admin/menu" className="text-emerald-400 hover:text-emerald-300">← Menu</Link>
      {" · "}
      <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">Definições</Link>
      {" · "}
      <Link href="/portal-admin/settings/items" className="text-emerald-400 hover:text-emerald-300">Gestão de Artigos</Link>
    </p>
  );

  if (isExcelOrigin) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Importar Excel</h1>
        <p className="text-slate-400 mb-2">
          A origem dos dados desta loja é Excel (NET-bo ou ZSbms). Utilize esta página para importar ou actualizar o ficheiro Excel.
        </p>
        {navLinks}

        <section className="mb-8">
          <ExcelImportForStore storeId={storeId} tenantNif={tenantNif.trim().toLowerCase()} />
        </section>
        {backupRow?.created_at && backupRow?.backup_type && (
          <section>
            <h2 className="text-lg font-medium text-slate-200 mb-2">Último backup</h2>
            <RestoreBackupButton
              storeId={storeId}
              createdAt={backupRow.created_at}
              backupType={backupRow.backup_type}
            />
          </section>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Sync NET-bo</h1>
      <p className="text-slate-400 mb-2">Sincronização de produtos a partir do NET-bo para o catálogo da loja. Configure a integração em Definições.</p>
      {navLinks}

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Disparar sync</h2>
          <TriggerSyncButton storeId={storeId} />
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-medium text-slate-200 mb-4">Histórico de syncs</h2>
        {(!runs || runs.length === 0) && <p className="text-slate-500">Nenhum sync executado ainda.</p>}
        {runs && runs.length > 0 && <SyncRunsTableClient runs={runs} />}
      </section>
      {backupRow?.created_at && backupRow?.backup_type && (
        <section>
          <h2 className="text-lg font-medium text-slate-200 mb-2">Último backup</h2>
          <RestoreBackupButton
            storeId={storeId}
            createdAt={backupRow.created_at}
            backupType={backupRow.backup_type}
          />
        </section>
      )}
    </div>
  );
}
