import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { encryptSecret } from "@/lib/credentials-crypto";

export const dynamic = "force-dynamic";

type StoredIntegrationConfig = {
  integration_type?: "none" | "netbo" | "storesace";
  netbo_dbname?: string;
  netbo_auth_method?: "login_password" | "api_token";
  netbo_login?: string;
  netbo_password_encrypted?: string;
  netbo_api_token_encrypted?: string;
  netbo_company_server_url?: string;
  netbo_token_last_ok_at?: string;
  timeout_sec?: number;
  retries?: number;
  retry_backoff_sec?: number;
  [key: string]: unknown;
};

export type SafeIntegrationConfig = {
  integration_type: "none" | "netbo" | "storesace";
  netbo_dbname?: string;
  netbo_auth_method?: "login_password" | "api_token";
  netbo_login?: string;
  netbo_company_server_url?: string;
  netbo_token_last_ok_at?: string;
  has_netbo_password_encrypted: boolean;
  has_netbo_api_token_encrypted: boolean;
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

function toSafeConfig(row: { source_type: string; config: StoredIntegrationConfig } | null): SafeIntegrationConfig {
  if (!row?.config) {
    return {
      integration_type: "none",
      has_netbo_password_encrypted: false,
      has_netbo_api_token_encrypted: false,
    };
  }
  const c = row.config as StoredIntegrationConfig;
  const integration_type = (c.integration_type ?? row.source_type ?? "none") as "none" | "netbo" | "storesace";
  return {
    integration_type: integration_type === "none" || integration_type === "netbo" || integration_type === "storesace" ? integration_type : "none",
    netbo_dbname: c.netbo_dbname,
    netbo_auth_method: c.netbo_auth_method,
    netbo_login: c.netbo_login,
    netbo_company_server_url: c.netbo_company_server_url,
    netbo_token_last_ok_at: c.netbo_token_last_ok_at,
    has_netbo_password_encrypted: !!c.netbo_password_encrypted,
    has_netbo_api_token_encrypted: !!c.netbo_api_token_encrypted,
  };
}

/** GET: return safe integration config for the store (no secrets). */
export async function GET(
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
    .select("source_type, config")
    .eq("store_id", storeId)
    .maybeSingle();

  return NextResponse.json(toSafeConfig(row));
}

/** POST: save integration config. Encrypts password/token; empty string = keep existing. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  const err = await ensureStoreAccess(storeId);
  if (err) return err;

  let body: {
    integration_type?: string;
    netbo_dbname?: string;
    netbo_auth_method?: string;
    netbo_login?: string;
    netbo_password?: string;
    netbo_api_token?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const integration_type = (body.integration_type ?? "none") as "none" | "netbo" | "storesace";
  const source_type = integration_type === "none" ? "none" : integration_type === "storesace" ? "storesace" : "netbo";

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

  const { data: existing } = await supabase
    .from("store_integrations")
    .select("config")
    .eq("store_id", storeId)
    .maybeSingle();

  const prev = (existing?.config ?? {}) as StoredIntegrationConfig;

  const config: StoredIntegrationConfig = {
    ...prev,
    integration_type,
    netbo_dbname: body.netbo_dbname ?? prev.netbo_dbname,
    netbo_auth_method: (body.netbo_auth_method as "login_password" | "api_token") ?? prev.netbo_auth_method,
    netbo_login: body.netbo_login !== undefined ? body.netbo_login : prev.netbo_login,
    netbo_company_server_url: prev.netbo_company_server_url,
    netbo_token_last_ok_at: prev.netbo_token_last_ok_at,
    timeout_sec: prev.timeout_sec ?? 30,
    retries: prev.retries ?? 3,
    retry_backoff_sec: prev.retry_backoff_sec ?? 1.5,
  };

  if (integration_type === "netbo") {
    const passwordPlain = typeof body.netbo_password === "string" ? body.netbo_password.trim() : "";
    const tokenPlain = typeof body.netbo_api_token === "string" ? body.netbo_api_token.trim() : "";
    if (passwordPlain) {
      try {
        config.netbo_password_encrypted = encryptSecret(passwordPlain, storeId);
      } catch (e) {
        return NextResponse.json(
          { error: "Encryption not configured (ENCRYPTION_MASTER_KEY)" },
          { status: 500 }
        );
      }
    } else if (prev.netbo_password_encrypted) {
      config.netbo_password_encrypted = prev.netbo_password_encrypted;
    }
    if (tokenPlain) {
      try {
        config.netbo_api_token_encrypted = encryptSecret(tokenPlain, storeId);
      } catch (e) {
        return NextResponse.json(
          { error: "Encryption not configured (ENCRYPTION_MASTER_KEY)" },
          { status: 500 }
        );
      }
    } else if (prev.netbo_api_token_encrypted) {
      config.netbo_api_token_encrypted = prev.netbo_api_token_encrypted;
    }
  } else {
    delete config.netbo_password_encrypted;
    delete config.netbo_api_token_encrypted;
    delete config.netbo_login;
    delete config.netbo_dbname;
    delete config.netbo_auth_method;
    delete config.netbo_company_server_url;
    delete config.netbo_token_last_ok_at;
  }

  const { error: upsertErr } = await supabase
    .from("store_integrations")
    .upsert(
      {
        store_id: storeId,
        source_type,
        config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id" }
    );

  if (upsertErr) {
    return NextResponse.json(
      { error: upsertErr.message },
      { status: 500 }
    );
  }

  const { data: row } = await supabase
    .from("store_integrations")
    .select("source_type, config")
    .eq("store_id", storeId)
    .single();

  return NextResponse.json(toSafeConfig(row ?? null));
}
