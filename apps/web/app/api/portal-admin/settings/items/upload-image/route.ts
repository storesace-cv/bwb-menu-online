import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { isAllowedImageMime, MAX_FILE_SIZE_BYTES } from "@/lib/image-import-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "menu-images";

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

/** POST: multipart form-data item_id (uuid), file (single). Same processing as image-import; path uses item id (app names the file). */
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const itemId = (formData.get("item_id") as string)?.trim();
  if (!itemId) {
    return NextResponse.json({ error: "item_id required" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Ficheiro obrigatório" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: menuItem, error: itemErr } = await admin
    .from("menu_items")
    .select("id, store_id")
    .eq("id", itemId)
    .single();

  if (itemErr || !menuItem) {
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  }

  const { data: hasAccess } = await supabase.rpc("user_has_store_access", {
    p_store_id: menuItem.store_id,
  });
  if (!hasAccess) {
    return NextResponse.json({ error: "Sem acesso a esta loja" }, { status: 403 });
  }

  const { data: canAccess } = await supabase.rpc("current_user_can_access_settings", {
    p_store_id: menuItem.store_id,
  });
  if (!canAccess) {
    return NextResponse.json({ error: "Sem permissão para alterar imagens" }, { status: 403 });
  }

  const { data: storeRow, error: storeErr } = await admin
    .from("stores")
    .select("id, tenant_id")
    .eq("id", menuItem.store_id)
    .single();
  if (storeErr || !storeRow) {
    return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
  }

  const { data: tenantRow, error: tenantErr } = await admin
    .from("tenants")
    .select("nif")
    .eq("id", storeRow.tenant_id)
    .single();
  if (tenantErr || !tenantRow) {
    return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });
  }

  const mime = file.type ?? "";
  if (!isAllowedImageMime(mime)) {
    return NextResponse.json(
      { error: "Tipo de ficheiro não permitido (use JPG, PNG ou WebP)" },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Ficheiro demasiado grande (máx. 10 MB)" },
      { status: 400 }
    );
  }

  const tenantNif = (tenantRow.nif ?? "").trim();
  const basePath = `tenants/${tenantNif}/stores/${menuItem.store_id}/items/${menuItem.id}/`;

  try {
    await ensureMenuImagesBucket(admin);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
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

    const path640 = `${basePath}640.webp`;
    const path320 = `${basePath}320.webp`;

    const { error: up640 } = await admin.storage
      .from(BUCKET)
      .upload(path640, webp640, { contentType: "image/webp", upsert: true });
    if (up640) {
      return NextResponse.json({ error: `Upload: ${up640.message}` }, { status: 500 });
    }

    const { error: up320 } = await admin.storage
      .from(BUCKET)
      .upload(path320, webp320, { contentType: "image/webp", upsert: true });
    if (up320) {
      await admin.storage.from(BUCKET).remove([path640]);
      return NextResponse.json({ error: `Upload: ${up320.message}` }, { status: 500 });
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
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, image_base_path: basePath });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
