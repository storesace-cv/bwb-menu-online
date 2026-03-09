import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { decryptSecret, PLATFORM_AI_CONTEXT } from "@/lib/credentials-crypto";
import { generateDescription } from "@/lib/server/ai";

export const dynamic = "force-dynamic";

const RATE_LIMIT_PER_HOUR = 10;

function getPeriodStart(): string {
  const d = new Date();
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

async function ensureStoreAccess(storeId: string): Promise<NextResponse | null> {
  const sessionClient = await createServerClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: hasAccess } = await sessionClient.rpc("user_has_store_access", {
    p_store_id: storeId,
  });
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Forbidden: no access to this store" },
      { status: 403 }
    );
  }
  return null;
}

/** POST: generate 3 description suggestions for an article. Rate limited per store per hour. */
export async function POST(request: NextRequest) {
  let body: { store_id: string; name: string; ingredients?: string; tone?: string; max_chars?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const storeId = body.store_id;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!storeId || !name) {
    return NextResponse.json(
      { error: "store_id and name are required" },
      { status: 400 }
    );
  }

  const err = await ensureStoreAccess(storeId);
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

  const { data: usesPlatformAi } = await supabase.rpc("store_uses_platform_ai", {
    p_store_id: storeId,
  });

  let aiEnabled: boolean;
  let provider: "openai" | "xai" | null;
  let encryptedKey: string | null | undefined;
  let settings: Record<string, unknown>;

  if (usesPlatformAi) {
    const { data: platformRow } = await supabase
      .from("platform_ai_settings")
      .select("ai_enabled, ai_provider, ai_model, ai_temperature, ai_max_chars, ai_tone, openai_api_key_enc, xai_api_key_enc")
      .eq("id", 1)
      .maybeSingle();
    aiEnabled = !!platformRow?.ai_enabled;
    provider = (platformRow?.ai_provider === "openai" || platformRow?.ai_provider === "xai")
      ? platformRow.ai_provider
      : null;
    encryptedKey = provider === "openai" ? platformRow?.openai_api_key_enc : platformRow?.xai_api_key_enc;
    settings = {
      ai_model: platformRow?.ai_model,
      ai_tone: platformRow?.ai_tone,
      ai_max_chars: platformRow?.ai_max_chars,
    };
  } else {
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

    settings = (settingsRow?.settings as Record<string, unknown>) ?? {};
    aiEnabled = !!settings.ai_enabled;
    provider = (settings.ai_provider === "openai" || settings.ai_provider === "xai")
      ? settings.ai_provider
      : null;
    encryptedKey =
      provider === "openai"
        ? secretsRow?.openai_api_key_enc
        : secretsRow?.xai_api_key_enc;
  }

  if (!aiEnabled || !provider) {
    return NextResponse.json(
      { error: "IA não está ativa. Ative em Configurações → ChatGPT / Grok." },
      { status: 400 }
    );
  }

  if (!encryptedKey) {
    return NextResponse.json(
      { error: "Chave API não configurada para o provider selecionado." },
      { status: 400 }
    );
  }

  const periodStart = getPeriodStart();
  const { data: usageRow } = await supabase
    .from("ai_usage")
    .select("count")
    .eq("store_id", storeId)
    .eq("period_start", periodStart)
    .maybeSingle();

  const currentCount = usageRow?.count ?? 0;
  if (currentCount >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json(
      {
        error: `Limite de gerações atingido (${RATE_LIMIT_PER_HOUR}/hora). Tente mais tarde.`,
      },
      { status: 429 }
    );
  }

  const decryptContext = usesPlatformAi ? PLATFORM_AI_CONTEXT : storeId;
  let apiKey: string;
  try {
    apiKey = decryptSecret(encryptedKey, decryptContext);
  } catch {
    return NextResponse.json(
      { error: "Não foi possível usar a chave API (configuração de cifragem)." },
      { status: 500 }
    );
  }

  const model =
    (typeof settings.ai_model === "string" ? settings.ai_model : null) ??
    (provider === "openai" ? "gpt-4o-mini" : "grok-3-mini");
  const tone =
    typeof body.tone === "string"
      ? body.tone
      : (typeof settings.ai_tone === "string" ? settings.ai_tone : "") ||
        "profissional e apetitoso (pt-PT)";
  const maxChars =
    typeof body.max_chars === "number"
      ? body.max_chars
      : typeof settings.ai_max_chars === "number"
        ? settings.ai_max_chars
        : 200;
  const ingredients = typeof body.ingredients === "string" ? body.ingredients.trim() : "";

  let suggestions: string[];
  try {
    suggestions = await generateDescription({
      provider,
      apiKey,
      model,
      tone,
      maxChars,
      name,
      ingredients,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao gerar descrições.";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }

  await supabase.from("ai_usage").upsert(
    {
      store_id: storeId,
      period_start: periodStart,
      count: currentCount + 1,
    },
    { onConflict: "store_id,period_start" }
  );

  return NextResponse.json({ suggestions });
}
