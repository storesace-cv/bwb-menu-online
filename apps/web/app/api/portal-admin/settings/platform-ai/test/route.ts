import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { decryptSecret, PLATFORM_AI_CONTEXT } from "@/lib/credentials-crypto";

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

/** POST: test platform AI connection; updates last_test_ok_at / last_test_error in platform_ai_settings. */
export async function POST() {
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
    .select("ai_provider, ai_model, openai_api_key_enc, xai_api_key_enc")
    .eq("id", 1)
    .maybeSingle();

  const provider = (row?.ai_provider === "openai" || row?.ai_provider === "xai")
    ? row.ai_provider
    : null;
  const model = (typeof row?.ai_model === "string" ? row.ai_model : null)
    ?? (provider === "openai" ? "gpt-4o-mini" : "grok-3-mini");

  if (!provider) {
    return NextResponse.json(
      { ok: false, provider: "none", model: null, message: "Selecione um provider (OpenAI ou xAI) e guarde." },
      { status: 400 }
    );
  }

  let apiKey: string;
  if (provider === "openai") {
    if (!row?.openai_api_key_enc) {
      return NextResponse.json(
        { ok: false, provider: "openai", model, message: "Chave API OpenAI não configurada." },
        { status: 400 }
      );
    }
    try {
      apiKey = decryptSecret(row.openai_api_key_enc, PLATFORM_AI_CONTEXT);
    } catch {
      return NextResponse.json(
        { ok: false, provider: "openai", model, message: "Não foi possível ler a chave (configuração de cifragem)." },
        { status: 500 }
      );
    }
  } else {
    if (!row?.xai_api_key_enc) {
      return NextResponse.json(
        { ok: false, provider: "xai", model, message: "Chave API xAI não configurada." },
        { status: 400 }
      );
    }
    try {
      apiKey = decryptSecret(row.xai_api_key_enc, PLATFORM_AI_CONTEXT);
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

  await supabase
    .from("platform_ai_settings")
    .update({
      last_test_ok_at: result.ok ? new Date().toISOString() : null,
      last_test_error: result.ok ? null : result.message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  return NextResponse.json({
    ok: result.ok,
    provider,
    model,
    message: result.message,
    latency_ms: result.latencyMs,
  });
}
