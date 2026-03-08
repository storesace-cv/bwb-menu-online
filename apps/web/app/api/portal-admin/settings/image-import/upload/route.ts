import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import {
  extractItemCodeFromFilename,
  isAllowedImageMime,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/image-import-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BUCKET = "menu-images";

/** Garante que o bucket menu-images existe; cria-o com public: true se faltar (service role). */
async function ensureMenuImagesBucket(admin: SupabaseClient): Promise<void> {
  const { data: buckets } = await admin.storage.listBuckets();
  const exists = buckets?.some((b) => b.id === BUCKET || b.name === BUCKET);
  if (exists) return;
  const { error } = await admin.storage.createBucket(BUCKET, { public: true });
  if (error) {
    if (error.message?.toLowerCase().includes("already exists") || error.message?.toLowerCase().includes("duplicate")) return;
    throw new Error(`Failed to create bucket ${BUCKET}: ${error.message}`);
  }
}

type FileResult = {
  filename: string;
  code: string;
  item_id: string | null;
  item_name: string | null;
  status: "saved" | "ignored" | "unmatched" | "error";
  message?: string;
};

async function ensureSettingsAccess(storeId: string): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: hasAccess } = await supabase.rpc("user_has_store_access", {
    p_store_id: storeId,
  });
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Forbidden: no access to this store" },
      { status: 403 }
    );
  }
  const { data: canAccess } = await supabase.rpc("current_user_can_access_settings", {
    p_store_id: storeId,
  });
  if (!canAccess) {
    return NextResponse.json(
      { error: "Forbidden: store admin required for image import" },
      { status: 403 }
    );
  }
  return null;
}

/** POST: multipart form-data store_id, overwrite, files (multiple). */
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const storeId = (formData.get("store_id") as string)?.trim();
  if (!storeId) {
    return NextResponse.json({ error: "store_id required" }, { status: 400 });
  }

  const err = await ensureSettingsAccess(storeId);
  if (err) return err;

  const overwrite = formData.get("overwrite") === "true" || formData.get("overwrite") === "1";
  const files: File[] = [];
  const filesField = formData.getAll("files");
  for (const f of filesField) {
    if (f instanceof File) files.push(f);
  }
  if (files.length === 0) {
    return NextResponse.json(
      { error: "At least one file required", results: [] },
      { status: 400 }
    );
  }

  const admin = createServiceClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: storeRow, error: storeErr } = await admin
    .from("stores")
    .select("id, tenant_id")
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
  const tenantNif = (tenantRow.nif ?? "").trim();

  try {
    await ensureMenuImagesBucket(admin);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: msg, results: [] },
      { status: 500 }
    );
  }

  const results: FileResult[] = [];

  for (const file of files) {
    const filename = file.name ?? "";
    const code = extractItemCodeFromFilename(filename);
    const result: FileResult = {
      filename,
      code,
      item_id: null,
      item_name: null,
      status: "unmatched",
    };

    if (!code) {
      result.status = "error";
      result.message = "Código não detetado no nome do ficheiro";
      results.push(result);
      continue;
    }

    const mime = file.type ?? "";
    if (!isAllowedImageMime(mime)) {
      result.status = "error";
      result.message = "Tipo de ficheiro não permitido (use JPG, PNG ou WebP)";
      results.push(result);
      continue;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      result.status = "error";
      result.message = "Ficheiro demasiado grande (máx. 10 MB)";
      results.push(result);
      continue;
    }

    const { data: menuItem, error: itemErr } = await admin
      .from("menu_items")
      .select("id, has_image, menu_name")
      .eq("store_id", storeId)
      .eq("item_code", code)
      .maybeSingle();

    if (itemErr) {
      result.status = "error";
      result.message = itemErr.message;
      results.push(result);
      continue;
    }
    if (!menuItem) {
      result.status = "unmatched";
      result.message = "Nenhum artigo encontrado com este código";
      results.push(result);
      continue;
    }

    result.item_id = menuItem.id;
    result.item_name = menuItem.menu_name ?? null;

    if (!overwrite && menuItem.has_image) {
      result.status = "ignored";
      result.message = "Artigo já tem imagem (ative substituir para sobrescrever)";
      results.push(result);
      continue;
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const rotated = await sharp(buffer).rotate();
      const webp640 = await rotated
        .clone()
        .resize(640, 480, { fit: "cover", position: "center" })
        .webp({ quality: 75 })
        .toBuffer();
      const webp320 = await rotated
        .clone()
        .resize(320, 240, { fit: "cover", position: "center" })
        .webp({ quality: 70 })
        .toBuffer();

      const basePath = `tenants/${tenantNif}/stores/${storeId}/items/${menuItem.id}/`;
      const path640 = `${basePath}640.webp`;
      const path320 = `${basePath}320.webp`;

      const { error: up640 } = await admin.storage
        .from(BUCKET)
        .upload(path640, webp640, {
          contentType: "image/webp",
          upsert: true,
        });
      if (up640) {
        result.status = "error";
        result.message = `Upload 640: ${up640.message}`;
        results.push(result);
        continue;
      }
      const { error: up320 } = await admin.storage
        .from(BUCKET)
        .upload(path320, webp320, {
          contentType: "image/webp",
          upsert: true,
        });
      if (up320) {
        result.status = "error";
        result.message = `Upload 320: ${up320.message}`;
        results.push(result);
        continue;
      }

      const { error: updateErr } = await admin
        .from("menu_items")
        .update({
          image_base_path: basePath,
          has_image: true,
          image_updated_at: new Date().toISOString(),
        })
        .eq("id", menuItem.id);

      if (updateErr) {
        result.status = "error";
        result.message = updateErr.message;
      } else {
        result.status = "saved";
        result.message = "Guardado";
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.status = "error";
      result.message = msg;
    }
    results.push(result);
  }

  return NextResponse.json({ results });
}
