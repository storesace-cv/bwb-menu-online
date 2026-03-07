import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { encryptSecret } from "@/lib/credentials-crypto";

export const dynamic = "force-dynamic";

async function ensureSettingsAccess(storeId: string): Promise<NextResponse | null> {
  const sessionClient = await createServerClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: canAccess } = await sessionClient.rpc("current_user_can_access_settings", {
    p_store_id: storeId,
  });
  if (!canAccess) {
    return NextResponse.json(
      { error: "Forbidden: only store admin can access AI settings" },
      { status: 403 }
    );
  }
  return null;
}

/** POST: save AI config. Encrypts api_key if provided; empty = keep existing. */
export async function POST(request: NextRequest) {
  let body: {
    store_id: string;
    ai_enabled?: boolean;
    ai_provider?: string;
    ai_model?: string | null;
    ai_temperature?: number | null;
    ai_max_chars?: number | null;
    ai_tone?: string | null;
    api_key?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const storeId = body.store_id;
  if (!storeId) {
    return NextResponse.json({ error: "store_id required" }, { status: 400 });
  }

  const err = await ensureSettingsAccess(storeId);
  if (err) return err;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not set" },
      { status: 500 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const provider = (body.ai_provider === "openai" || body.ai_provider === "xai" || body.ai_provider === "disabled")
    ? body.ai_provider
    : undefined;

  const apiKeyPlain = typeof body.api_key === "string" ? body.api_key.trim() : "";

  if (apiKeyPlain && (provider === "openai" || provider === "xai")) {
    try {
      const encrypted = encryptSecret(apiKeyPlain, storeId);
      const { data: existing } = await supabase
        .from("store_secrets")
        .select("store_id")
        .eq("store_id", storeId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("store_secrets")
          .update({
            ...(provider === "openai" ? { openai_api_key_enc: encrypted } : { xai_api_key_enc: encrypted }),
            updated_at: new Date().toISOString(),
          })
          .eq("store_id", storeId);
      } else {
        await supabase.from("store_secrets").insert({
          store_id: storeId,
          ...(provider === "openai" ? { openai_api_key_enc: encrypted } : { xai_api_key_enc: encrypted }),
        });
      }
    } catch (e) {
      return NextResponse.json(
        { error: "Encryption not configured (ENCRYPTION_MASTER_KEY)" },
        { status: 500 }
      );
    }
  }

  const { data: settingsRow } = await supabase
    .from("store_settings")
    .select("settings")
    .eq("store_id", storeId)
    .maybeSingle();

  const prev = (settingsRow?.settings as Record<string, unknown>) ?? {};
  const nextSettings: Record<string, unknown> = {
    ...prev,
  };
  if (typeof body.ai_enabled === "boolean") nextSettings.ai_enabled = body.ai_enabled;
  if (provider !== undefined) nextSettings.ai_provider = provider;
  if (body.ai_model !== undefined) nextSettings.ai_model = body.ai_model;
  if (body.ai_temperature !== undefined) nextSettings.ai_temperature = body.ai_temperature;
  if (body.ai_max_chars !== undefined) nextSettings.ai_max_chars = body.ai_max_chars;
  if (body.ai_tone !== undefined) nextSettings.ai_tone = body.ai_tone;

  await supabase
    .from("store_settings")
    .upsert(
      {
        store_id: storeId,
        settings: nextSettings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id" }
    );

  const { data: secretsRow } = await supabase
    .from("store_secrets")
    .select("openai_api_key_enc, xai_api_key_enc")
    .eq("store_id", storeId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    has_openai_key: !!secretsRow?.openai_api_key_enc,
    has_xai_key: !!secretsRow?.xai_api_key_enc,
  });
}
