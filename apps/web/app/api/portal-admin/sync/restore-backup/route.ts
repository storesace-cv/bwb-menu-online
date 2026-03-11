import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type BackupSnapshotNetbo = { catalog_items: Record<string, unknown>[] };
type BackupSnapshotExcel = {
  tenant_nif: string;
  excel_rows: Record<string, unknown>[];
  catalog_items: Record<string, unknown>[];
  menu_items: Record<string, unknown>[];
};

/** POST: restaura o último backup da loja. Body: { store_id: string }. Requer user_has_store_access(store_id). */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { store_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const storeId = body.store_id?.trim();
  if (!storeId) {
    return NextResponse.json({ error: "store_id required" }, { status: 400 });
  }

  const { data: hasAccess } = await supabase.rpc("user_has_store_access", { p_store_id: storeId });
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden: no access to this store" }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const { data: backup, error: backupErr } = await admin
    .from("store_sync_backups")
    .select("backup_type, snapshot")
    .eq("store_id", storeId)
    .single();
  if (backupErr || !backup) {
    return NextResponse.json({ error: "Backup não encontrado para esta loja" }, { status: 404 });
  }

  const backupType = backup.backup_type as string;
  const snapshot = backup.snapshot as BackupSnapshotNetbo | BackupSnapshotExcel;

  if (backupType === "netbo") {
    const { catalog_items: catalogRows } = snapshot as BackupSnapshotNetbo;
    if (!Array.isArray(catalogRows)) {
      return NextResponse.json({ error: "Snapshot inválido" }, { status: 400 });
    }
    const { error: delErr } = await admin
      .from("catalog_items")
      .delete()
      .eq("store_id", storeId)
      .eq("source_type", "netbo");
    if (delErr) {
      return NextResponse.json({ error: `Erro ao apagar catálogo: ${delErr.message}` }, { status: 500 });
    }
    if (catalogRows.length > 0) {
      const { error: insErr } = await admin.from("catalog_items").insert(
        catalogRows.map((r) => ({
          ...r,
          store_id: storeId,
        }))
      );
      if (insErr) {
        return NextResponse.json({ error: `Erro ao restaurar catálogo: ${insErr.message}` }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (backupType === "excel_netbo" || backupType === "excel_zsbms") {
    const { tenant_nif, excel_rows, catalog_items: catalogRows, menu_items: menuRows } = snapshot as BackupSnapshotExcel;
    if (!tenant_nif || !Array.isArray(excel_rows) || !Array.isArray(catalogRows) || !Array.isArray(menuRows)) {
      return NextResponse.json({ error: "Snapshot Excel inválido" }, { status: 400 });
    }
    const tableName = backupType === "excel_netbo" ? "excel_netbo_imports" : "excel_zsbms_imports";
    const catalogIds = catalogRows.map((r) => (r.id as string)).filter(Boolean);

    await admin.from(tableName).delete().eq("tenant_nif", tenant_nif).eq("store_id", storeId);

    if (menuRows.length > 0) {
      const { error: delMenuErr } = await admin
        .from("menu_items")
        .delete()
        .eq("store_id", storeId)
        .in("catalog_item_id", catalogIds);
      if (delMenuErr) {
        return NextResponse.json({ error: `Erro ao apagar menu_items: ${delMenuErr.message}` }, { status: 500 });
      }
    }

    const { error: delCatErr } = await admin
      .from("catalog_items")
      .delete()
      .eq("store_id", storeId)
      .eq("source_type", backupType);
    if (delCatErr) {
      return NextResponse.json({ error: `Erro ao apagar catálogo: ${delCatErr.message}` }, { status: 500 });
    }

    if (excel_rows.length > 0) {
      const { error: insExcelErr } = await admin.from(tableName).insert(
        excel_rows.map((r) => ({ ...r, tenant_nif, store_id: storeId }))
      );
      if (insExcelErr) {
        return NextResponse.json({ error: `Erro ao restaurar Excel: ${insExcelErr.message}` }, { status: 500 });
      }
    }
    if (catalogRows.length > 0) {
      const { error: insCatErr } = await admin.from("catalog_items").insert(
        catalogRows.map((r) => ({ ...r, store_id: storeId }))
      );
      if (insCatErr) {
        return NextResponse.json({ error: `Erro ao restaurar catálogo: ${insCatErr.message}` }, { status: 500 });
      }
    }
    if (menuRows.length > 0) {
      const { error: insMenuErr } = await admin.from("menu_items").insert(
        menuRows.map((r) => ({ ...r, store_id: storeId }))
      );
      if (insMenuErr) {
        return NextResponse.json({ error: `Erro ao restaurar menu_items: ${insMenuErr.message}` }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Tipo de backup não suportado" }, { status: 400 });
}
