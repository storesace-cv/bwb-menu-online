import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { encryptSecret, PLATFORM_AI_CONTEXT } from "@/lib/credentials-crypto";

export const dynamic = "force-dynamic";

async function ensureSuperadmin(): Promise<NextResponse | null> {
  const sessionClient = await createServerClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: isSuper } = await sessionClient.rpc("current_user_is_superadmin");
  if (!isSuper) {
    return NextResponse.json(
      { error: "Forbidden: only superadmin can access platform AI settings" },
      { status: 403 }
    );
  }
  return null;
}

/** POST: save platform AI config and tenant_ids list. */
export async function POST(request: NextRequest) {
  let body: {
    ai_enabled?: boolean;
    ai_provider?: string;
    ai_model?: string | null;
    ai_temperature?: number | null;
    ai_max_chars?: number | null;
    ai_tone?: string | null;
    api_key?: string;
    tenant_ids?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const err = await ensureSuperadmin();
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

  const { data: existing } = await supabase
    .from("platform_ai_settings")
    .select("id, openai_api_key_enc, xai_api_key_enc")
    .eq("id", 1)
    .maybeSingle();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.ai_enabled === "boolean") updates.ai_enabled = body.ai_enabled;
  if (provider !== undefined) updates.ai_provider = provider;
  if (body.ai_model !== undefined) updates.ai_model = body.ai_model;
  if (body.ai_temperature !== undefined) updates.ai_temperature = body.ai_temperature;
  if (body.ai_max_chars !== undefined) updates.ai_max_chars = body.ai_max_chars;
  if (body.ai_tone !== undefined) updates.ai_tone = body.ai_tone;

  if (apiKeyPlain && (provider === "openai" || provider === "xai")) {
    try {
      const encrypted = encryptSecret(apiKeyPlain, PLATFORM_AI_CONTEXT);
      if (provider === "openai") updates.openai_api_key_enc = encrypted;
      else updates.xai_api_key_enc = encrypted;
    } catch (e) {
      return NextResponse.json(
        { error: "Encryption not configured (ENCRYPTION_MASTER_KEY)" },
        { status: 500 }
      );
    }
  }

  await supabase
    .from("platform_ai_settings")
    .upsert({ id: 1, ...updates }, { onConflict: "id" });

  const tenantIds = Array.isArray(body.tenant_ids)
    ? body.tenant_ids.filter((id): id is string => typeof id === "string")
    : [];

  const { data: currentTenants } = await supabase.from("platform_ai_tenants").select("tenant_id");
  if (currentTenants?.length) {
    await supabase
      .from("platform_ai_tenants")
      .delete()
      .in("tenant_id", currentTenants.map((r) => r.tenant_id));
  }
  if (tenantIds.length > 0) {
    await supabase.from("platform_ai_tenants").insert(
      tenantIds.map((tenant_id) => ({ tenant_id }))
    );
  }

  const { data: row } = await supabase
    .from("platform_ai_settings")
    .select("openai_api_key_enc, xai_api_key_enc")
    .eq("id", 1)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    has_openai_key: !!row?.openai_api_key_enc,
    has_xai_key: !!row?.xai_api_key_enc,
  });
}
