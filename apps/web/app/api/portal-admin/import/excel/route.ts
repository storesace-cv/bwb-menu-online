import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { readExcel, rowHash, type ExcelTemplateType } from "@/lib/excel-import";
import { getSourceTypeLabel } from "@/app/portal-admin/tenants/source-type-options";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const EXCEL_COMPATIBLE_SOURCE_TYPES = ["excel_netbo", "excel_zsbms", "manual"] as const;

function isStoreCompatibleWithImport(storeSourceType: string, fileType: ExcelTemplateType): boolean {
  if (!EXCEL_COMPATIBLE_SOURCE_TYPES.includes(storeSourceType as (typeof EXCEL_COMPATIBLE_SOURCE_TYPES)[number])) {
    return false;
  }
  if (storeSourceType === "manual") return true;
  return storeSourceType === fileType;
}

/** POST: upload Excel file for import. Multipart: store_id, tenant_nif, file. Superadmin only. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: isSuper } = await supabase.rpc("current_user_is_superadmin");
  if (!isSuper) {
    return NextResponse.json({ error: "Forbidden: superadmin required" }, { status: 403 });
  }

  let storeId: string;
  let tenantNif: string;
  let file: File;
  let fileName: string;
  try {
    const formData = await request.formData();
    storeId = (formData.get("store_id") as string)?.trim() ?? "";
    tenantNif = (formData.get("tenant_nif") as string)?.trim() ?? "";
    file = formData.get("file") as File;
    if (!storeId || !tenantNif || !file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "store_id, tenant_nif and file (xlsx) are required" },
        { status: 400 }
      );
    }
    fileName = file.name ?? "";
    if (!fileName.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "File must be .xlsx" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const { data: storeRow, error: storeErr } = await admin
    .from("stores")
    .select("id, source_type, tenant_id")
    .eq("id", storeId)
    .single();
  if (storeErr || !storeRow) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const { data: tenantRow, error: tenantErr } = await admin
    .from("tenants")
    .select("nif")
    .eq("id", storeRow.tenant_id)
    .single();
  if (tenantErr || !tenantRow) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const storeTenantNif = (tenantRow.nif ?? "").trim().toLowerCase();
  const requestedNif = tenantNif.trim().toLowerCase();
  if (storeTenantNif !== requestedNif) {
    return NextResponse.json(
      { error: "tenant_nif does not match the store's tenant" },
      { status: 400 }
    );
  }

  const storeSourceType = (storeRow.source_type ?? "").trim();
  if (!EXCEL_COMPATIBLE_SOURCE_TYPES.includes(storeSourceType as (typeof EXCEL_COMPATIBLE_SOURCE_TYPES)[number])) {
    const label = getSourceTypeLabel(storeRow.source_type ?? "");
    return NextResponse.json(
      {
        error: `A loja está configurada para ${label}. Mude a Origem dos Dados em Definições ou escolha outra loja.`,
      },
      { status: 400 }
    );
  }

  let buffer: Buffer;
  try {
    const ab = await file.arrayBuffer();
    buffer = Buffer.from(ab);
  } catch {
    return NextResponse.json({ error: "Failed to read file" }, { status: 400 });
  }

  let detectedType: ExcelTemplateType;
  let rows: Record<string, string>[];
  let fileHashValue: string;
  try {
    const result = readExcel(buffer);
    detectedType = result.detectedType;
    rows = result.rows;
    fileHashValue = result.fileHash;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (!isStoreCompatibleWithImport(storeRow.source_type ?? "", detectedType)) {
    const label = getSourceTypeLabel(storeRow.source_type ?? "");
    return NextResponse.json(
      {
        error: `A loja está configurada para ${label}. O ficheiro é do tipo ${detectedType}. Mude a Origem dos Dados ou escolha outra loja.`,
      },
      { status: 400 }
    );
  }

  const tableName = detectedType === "excel_netbo" ? "excel_netbo_imports" : "excel_zsbms_imports";
  const now = new Date().toISOString();

  const { data: runRow, error: runInsertErr } = await admin
    .from("import_runs")
    .insert({
      source_type: detectedType,
      tenant_nif: requestedNif,
      store_id: storeId,
      file_name: fileName || null,
      file_hash: fileHashValue,
      imported_by: user.id,
      started_at: now,
    })
    .select("id")
    .single();
  if (runInsertErr || !runRow) {
    return NextResponse.json({ error: "Failed to create import run" }, { status: 500 });
  }
  const runId = runRow.id;

  try {
    await admin.from(tableName).update({
      is_discontinued: true,
      discontinued_at: now,
    }).eq("tenant_nif", requestedNif).eq("store_id", storeId);

    const { data: existingRows } = await admin
      .from(tableName)
      .select("codigo, row_hash")
      .eq("tenant_nif", requestedNif)
      .eq("store_id", storeId);
    const existingByCodigo = new Map<string, string>();
    for (const r of existingRows ?? []) {
      existingByCodigo.set((r.codigo ?? "").trim(), (r.row_hash ?? "") as string);
    }

    let upserted = 0;
    let updated = 0;
    let unchanged = 0;

    const basePayload = {
      tenant_nif: requestedNif,
      store_id: storeId,
      source_type: detectedType,
      file_hash: fileHashValue,
      imported_by: user.id,
      is_discontinued: false,
      discontinued_at: null,
      last_seen_import_at: now,
    };

    for (const row of rows) {
      const codigo = (row.codigo ?? "").trim();
      if (!codigo) continue;
      const hash = rowHash(row);
      const existingHash = existingByCodigo.get(codigo);
      const payload = {
        ...basePayload,
        ...row,
        row_hash: hash,
        last_seen_import_at: now,
        is_discontinued: false,
        discontinued_at: null,
      };
      if (detectedType === "excel_netbo") {
        (payload as Record<string, unknown>).imported_at = now;
      }
      if (existingHash === hash) {
        await admin.from(tableName).update({
          is_discontinued: false,
          discontinued_at: null,
          last_seen_import_at: now,
        }).eq("tenant_nif", requestedNif).eq("store_id", storeId).eq("codigo", codigo);
        unchanged++;
      } else {
        const { error: uErr } = await admin.from(tableName).upsert(payload, {
          onConflict: "tenant_nif,store_id,codigo",
          ignoreDuplicates: false,
        });
        if (uErr) {
          throw new Error(`Upsert failed: ${uErr.message}`);
        }
        if (existingHash !== undefined) {
          updated++;
        } else {
          upserted++;
        }
      }
    }

    const { count: discontinuedCount } = await admin
      .from(tableName)
      .select("codigo", { count: "exact", head: true })
      .eq("tenant_nif", requestedNif)
      .eq("store_id", storeId)
      .eq("is_discontinued", true);

    if (storeRow.source_type !== "demo") {
      const { error: propErr } = await admin.rpc("propagate_import_to_catalog_and_menu", {
        p_store_id: storeId,
        p_tenant_nif: requestedNif,
        p_source_type: detectedType,
      });
      if (propErr) {
        throw new Error(`Propagation failed: ${propErr.message}`);
      }
    }

    const counts = {
      read_rows: rows.length,
      upserted,
      updated,
      unchanged,
      discontinued: discontinuedCount ?? 0,
    };

    await admin
      .from("import_runs")
      .update({
        finished_at: new Date().toISOString(),
        counts,
        error: null,
      })
      .eq("id", runId);

    return NextResponse.json({
      ok: true,
      detected_type: detectedType,
      run_id: runId,
      counts,
      warnings: [] as string[],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin
      .from("import_runs")
      .update({
        finished_at: new Date().toISOString(),
        error: msg,
      })
      .eq("id", runId);
    return NextResponse.json(
      { ok: false, error: msg, run_id: runId },
      { status: 500 }
    );
  }
}
