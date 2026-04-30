import { NextRequest, NextResponse } from "next/server";
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
      { error: "Forbidden: only superadmin can reveal platform AI key" },
      { status: 403 }
    );
  }
  return null;
}

export async function POST(request: NextRequest) {
  const err = await ensureSuperadmin();
  if (err) return err;

  let body: { provider?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const provider = body.provider === "openai" || body.provider === "xai" ? body.provider : null;
  if (!provider) {
    return NextResponse.json({ error: "Provider inválido" }, { status: 400 });
  }

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
    .select("openai_api_key_enc, xai_api_key_enc")
    .eq("id", 1)
    .maybeSingle();

  const encrypted = provider === "openai" ? row?.openai_api_key_enc : row?.xai_api_key_enc;
  if (!encrypted || typeof encrypted !== "string") {
    return NextResponse.json({ error: "Chave não configurada" }, { status: 404 });
  }

  try {
    const api_key = decryptSecret(encrypted, PLATFORM_AI_CONTEXT);
    return NextResponse.json({ ok: true, api_key });
  } catch {
    return NextResponse.json(
      { error: "Falha ao desencriptar chave (ENCRYPTION_MASTER_KEY)" },
      { status: 500 }
    );
  }
}
