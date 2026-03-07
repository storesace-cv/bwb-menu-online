import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { decryptSecret } from "@/lib/credentials-crypto";

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

async function testOpenAI(apiKey: string, model: string): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
  const start = Date.now();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: [{ role: "user", content: "Diz apenas: OK" }],
      max_tokens: 10,
    }),
  });
  const latencyMs = Date.now() - start;
  if (!res.ok) {
    const errBody = await res.text();
    let message = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(errBody);
      if (j.error?.message) message = j.error.message;
    } catch {
      if (errBody.length < 200) message = errBody;
    }
    return { ok: false, message, latencyMs };
  }
  return { ok: true, message: "Ligação OK", latencyMs };
}

async function testXAI(apiKey: string, model: string): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
  const start = Date.now();
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "grok-3-mini",
      messages: [{ role: "user", content: "Diz apenas: OK" }],
      max_tokens: 10,
    }),
  });
  const latencyMs = Date.now() - start;
  if (!res.ok) {
    const errBody = await res.text();
    let message = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(errBody);
      if (j.error?.message) message = j.error.message;
    } catch {
      if (errBody.length < 200) message = errBody;
    }
    return { ok: false, message, latencyMs };
  }
  return { ok: true, message: "Ligação OK", latencyMs };
}

/** POST: test AI provider connection; updates last_test_ok_at / last_test_error in store_settings. */
export async function POST(request: NextRequest) {
  let body: { store_id: string };
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
  const provider = (settings.ai_provider === "openai" || settings.ai_provider === "xai")
    ? settings.ai_provider
    : null;
  const model = (typeof settings.ai_model === "string" ? settings.ai_model : null)
    ?? (provider === "openai" ? "gpt-4o-mini" : "grok-3-mini");

  if (!provider) {
    return NextResponse.json(
      { ok: false, provider: "none", model: null, message: "Selecione um provider (OpenAI ou xAI) e guarde." },
      { status: 400 }
    );
  }

  let apiKey: string;
  if (provider === "openai") {
    if (!secretsRow?.openai_api_key_enc) {
      return NextResponse.json(
        { ok: false, provider: "openai", model, message: "Chave API OpenAI não configurada." },
        { status: 400 }
      );
    }
    try {
      apiKey = decryptSecret(secretsRow.openai_api_key_enc, storeId);
    } catch {
      return NextResponse.json(
        { ok: false, provider: "openai", model, message: "Não foi possível ler a chave (configuração de cifragem)." },
        { status: 500 }
      );
    }
  } else {
    if (!secretsRow?.xai_api_key_enc) {
      return NextResponse.json(
        { ok: false, provider: "xai", model, message: "Chave API xAI não configurada." },
        { status: 400 }
      );
    }
    try {
      apiKey = decryptSecret(secretsRow.xai_api_key_enc, storeId);
    } catch {
      return NextResponse.json(
        { ok: false, provider: "xai", model, message: "Não foi possível ler a chave (configuração de cifragem)." },
        { status: 500 }
      );
    }
  }

  const result = provider === "openai"
    ? await testOpenAI(apiKey, model)
    : await testXAI(apiKey, model);

  const nextSettings = { ...settings } as Record<string, unknown>;
  if (result.ok) {
    nextSettings.last_test_ok_at = new Date().toISOString();
    nextSettings.last_test_error = null;
  } else {
    nextSettings.last_test_error = result.message;
  }

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

  return NextResponse.json({
    ok: result.ok,
    provider,
    model,
    message: result.message,
    latency_ms: result.latencyMs,
  });
}
