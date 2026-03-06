import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { decryptSecret } from "@/lib/credentials-crypto";
import { netboTestConnection } from "@/lib/netbo";
import type { NetboConfig } from "@/lib/netbo";

export const dynamic = "force-dynamic";

type StoredConfig = {
  integration_type?: string;
  netbo_dbname?: string;
  netbo_auth_method?: "login_password" | "api_token";
  netbo_login?: string;
  netbo_password_encrypted?: string;
  netbo_api_token_encrypted?: string;
  netbo_company_server_url?: string;
  netbo_token_last_ok_at?: string;
  [key: string]: unknown;
};

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

function buildNetboConfig(storeId: string, c: StoredConfig): NetboConfig | null {
  if (c.integration_type !== "netbo" && c.netbo_dbname) {
    // allow test when we have netbo config even if integration_type not set
  }
  if (!c.netbo_dbname) return null;
  const auth_method = c.netbo_auth_method ?? "login_password";
  const config: NetboConfig = {
    dbname: c.netbo_dbname,
    auth_method,
    server_hint: c.netbo_company_server_url ? undefined : undefined,
  };
  if (c.netbo_company_server_url) {
    const m = c.netbo_company_server_url.match(/^https:\/\/([^.]+)\.api\.net-bo\.com/);
    if (m) config.server_hint = m[1];
  }
  if (auth_method === "api_token" && c.netbo_api_token_encrypted) {
    try {
      config.api_token = decryptSecret(c.netbo_api_token_encrypted, storeId);
    } catch {
      return null;
    }
  } else if (auth_method === "login_password" && c.netbo_login && c.netbo_password_encrypted) {
    try {
      config.login = c.netbo_login;
      config.password = decryptSecret(c.netbo_password_encrypted, storeId);
    } catch {
      return null;
    }
  } else {
    return null;
  }
  return config;
}

/** POST: test NET-BO connection; on success updates netbo_company_server_url and netbo_token_last_ok_at. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
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

  const { data: row } = await supabase
    .from("store_integrations")
    .select("config")
    .eq("store_id", storeId)
    .eq("source_type", "netbo")
    .maybeSingle();

  const c = (row?.config ?? {}) as StoredConfig;
  const config = buildNetboConfig(storeId, c);
  if (!config) {
    return NextResponse.json(
      { test_result: "error" as const, error: "Invalid or incomplete NET-BO config (missing credentials)" },
      { status: 400 }
    );
  }

  const result = await netboTestConnection(config);

  if (result.ok && result.base_url) {
    const serverUrl = result.base_url;
    const updatedConfig = { ...c, netbo_company_server_url: serverUrl, netbo_token_last_ok_at: new Date().toISOString() };
    await supabase
      .from("store_integrations")
      .update({ config: updatedConfig, updated_at: new Date().toISOString() })
      .eq("store_id", storeId);
  }

  return NextResponse.json({
    base_url: result.base_url || undefined,
    auth_method: result.auth_method,
    test_result: result.ok ? "ok" : "error",
    error: result.error,
  });
}
