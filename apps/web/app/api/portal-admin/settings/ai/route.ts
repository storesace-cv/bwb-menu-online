import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export type AISettingsSafe = {
  ai_provider: "openai" | "xai" | "disabled";
  ai_enabled: boolean;
  ai_model: string | null;
  ai_temperature: number | null;
  ai_max_chars: number | null;
  ai_tone: string | null;
  last_test_ok_at: string | null;
  last_test_error: string | null;
  has_openai_key: boolean;
  has_xai_key: boolean;
};

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

/** GET: return safe AI config for the store (no secrets). */
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("store_id");
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

  const { data: settingsRow } = await supabase
    .from("store_settings")
    .select("settings")
    .eq("store_id", storeId)
    .maybeSingle();

  const { data: secretsRow } = await supabase
    .from("store_secrets")
    .select("openai_api_key_enc, xai_api_key_enc")
    .eq("store_id", storeId)
    .maybeSingle();

  const settings = (settingsRow?.settings as Record<string, unknown>) ?? {};
  const safe: AISettingsSafe = {
    ai_provider: (settings.ai_provider as "openai" | "xai" | "disabled") ?? "disabled",
    ai_enabled: !!settings.ai_enabled,
    ai_model: (settings.ai_model as string) ?? null,
    ai_temperature: typeof settings.ai_temperature === "number" ? settings.ai_temperature : null,
    ai_max_chars: typeof settings.ai_max_chars === "number" ? settings.ai_max_chars : null,
    ai_tone: typeof settings.ai_tone === "string" ? settings.ai_tone : null,
    last_test_ok_at: typeof settings.last_test_ok_at === "string" ? settings.last_test_ok_at : null,
    last_test_error: typeof settings.last_test_error === "string" ? settings.last_test_error : null,
    has_openai_key: !!secretsRow?.openai_api_key_enc,
    has_xai_key: !!secretsRow?.xai_api_key_enc,
  };

  return NextResponse.json(safe);
}
