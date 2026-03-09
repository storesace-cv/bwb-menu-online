import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export type PlatformAISettingsSafe = {
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
  tenant_ids: string[];
};

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

/** GET: return platform AI config (safe, no secrets) and list of tenant_ids that use it. */
export async function GET() {
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

  const { data: row } = await supabase
    .from("platform_ai_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  const { data: tenantRows } = await supabase
    .from("platform_ai_tenants")
    .select("tenant_id");

  const tenantIds = (tenantRows ?? []).map((r) => r.tenant_id);

  const safe: PlatformAISettingsSafe = {
    ai_provider: (row?.ai_provider as "openai" | "xai" | "disabled") ?? "disabled",
    ai_enabled: !!row?.ai_enabled,
    ai_model: row?.ai_model ?? null,
    ai_temperature: typeof row?.ai_temperature === "number" ? row.ai_temperature : null,
    ai_max_chars: typeof row?.ai_max_chars === "number" ? row.ai_max_chars : null,
    ai_tone: typeof row?.ai_tone === "string" ? row.ai_tone : null,
    last_test_ok_at: typeof row?.last_test_ok_at === "string" ? row.last_test_ok_at : null,
    last_test_error: typeof row?.last_test_error === "string" ? row.last_test_error : null,
    has_openai_key: !!row?.openai_api_key_enc,
    has_xai_key: !!row?.xai_api_key_enc,
    tenant_ids: tenantIds,
  };

  return NextResponse.json(safe);
}
