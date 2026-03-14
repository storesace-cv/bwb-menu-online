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

/** POST: multipart form-data file (required), name (optional). Superadmin only. */
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: isSuper } = await supabase.rpc("current_user_is_superadmin");
  if (!isSuper) {
    return NextResponse.json({ error: "Forbidden: superadmin only" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Ficheiro obrigatório" }, { status: 400 });
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

  const name = (formData.get("name") as string)?.trim() || file.name.replace(/\.[^.]+$/i, "").trim() || "Sample";

  const admin = createServiceClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    await ensureMenuImagesBucket(admin);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { data: row, error: insertErr } = await admin
    .from("image_samples")
    .insert({ name: name || null, image_base_path: "pending" })
    .select("id")
    .single();

  if (insertErr || !row) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Failed to create image_samples row" },
      { status: 500 }
    );
  }

  const sampleId = row.id;
  const basePath = `samples/${sampleId}/`;

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
      await admin.from("image_samples").delete().eq("id", sampleId);
      return NextResponse.json({ error: `Upload 640: ${up640.message}` }, { status: 500 });
    }

    const { error: up320 } = await admin.storage
      .from(BUCKET)
      .upload(path320, webp320, { contentType: "image/webp", upsert: true });
    if (up320) {
      await admin.storage.from(BUCKET).remove([path640]);
      await admin.from("image_samples").delete().eq("id", sampleId);
      return NextResponse.json({ error: `Upload 320: ${up320.message}` }, { status: 500 });
    }

    const { error: updateErr } = await admin
      .from("image_samples")
      .update({ image_base_path: basePath })
      .eq("id", sampleId);

    if (updateErr) {
      await admin.storage.from(BUCKET).remove([path640, path320]);
      await admin.from("image_samples").delete().eq("id", sampleId);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      id: sampleId,
      name: name || null,
      image_base_path: basePath,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from("image_samples").delete().eq("id", sampleId).then(() => {});
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
