import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  netboAuth,
  netboFetchProducts,
  normalizeProduct,
  type NetboConfig,
} from "@/lib/netbo";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { decryptSecret } from "@/lib/credentials-crypto";

type StoredConfig = {
  netbo_dbname?: string;
  netbo_auth_method?: "login_password" | "api_token";
  netbo_login?: string;
  netbo_password_encrypted?: string;
  netbo_api_token_encrypted?: string;
  netbo_company_server_url?: string;
  [key: string]: unknown;
};

function configToNetboConfig(storeId: string, c: StoredConfig): NetboConfig | null {
  if (!c?.netbo_dbname) return null;
  const auth_method = c.netbo_auth_method ?? "login_password";
  const config: NetboConfig = {
    dbname: c.netbo_dbname,
    auth_method,
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

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST /api/sync/netbo — body: { store_id: string }. Requires auth + user_has_store_access(store_id). */
export async function POST(request: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not set" },
      { status: 500 }
    );
  }

  let body: { store_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const storeId = body.store_id;
  if (!storeId) {
    return NextResponse.json(
      { error: "store_id required" },
      { status: 400 }
    );
  }

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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const { data: integration, error: intError } = await supabase
    .from("store_integrations")
    .select("id, source_type, config")
    .eq("store_id", storeId)
    .eq("source_type", "netbo")
    .single();

  if (intError || !integration) {
    return NextResponse.json(
      { error: "Store integration not found or not NET-bo" },
      { status: 404 }
    );
  }

  const stored = integration.config as StoredConfig;
  const config = configToNetboConfig(storeId, stored);
  if (!config) {
    return NextResponse.json(
      { error: "Invalid NET-bo config (dbname and credentials required; check ENCRYPTION_MASTER_KEY)" },
      { status: 400 }
    );
  }

  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  const logEvent = async (
    level: string,
    message: string,
    payload?: Record<string, unknown>
  ) => {
    await supabase.from("sync_events").insert({
      run_id: runId,
      level,
      message,
      payload: payload ?? null,
    });
  };

  try {
    await supabase.from("sync_runs").insert({
      id: runId,
      store_id: storeId,
      source_type: "netbo",
      status: "running",
      started_at: startedAt,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to create sync run" },
      { status: 500 }
    );
  }

  let counts = { fetched: 0, upserted: 0, errors: 0 };

  try {
    const token = await netboAuth(config);
    await logEvent("info", "Auth OK");

    const products = await netboFetchProducts(config, token);
    counts.fetched = products.length;
    await logEvent("info", `Fetched ${products.length} products`, {
      count: products.length,
    });

    // Backup estado actual de catalog_items (netbo) antes de upsert; um backup por loja.
    const { data: catalogRows } = await supabase
      .from("catalog_items")
      .select("*")
      .eq("store_id", storeId)
      .eq("source_type", "netbo");
    const snapshot = { catalog_items: catalogRows ?? [] };
    await supabase.from("store_sync_backups").delete().eq("store_id", storeId);
    await supabase.from("store_sync_backups").insert({
      store_id: storeId,
      backup_type: "netbo",
      created_at: startedAt,
      snapshot,
    });

    for (const p of products) {
      try {
        const row = normalizeProduct(p, storeId, "netbo");
        const { error: upsertErr } = await supabase.from("catalog_items").upsert(
          {
            ...row,
            last_synced_at: new Date().toISOString(),
          },
          {
            onConflict: "store_id,source_type,external_id",
            ignoreDuplicates: false,
          }
        );
        if (upsertErr) {
          counts.errors++;
          await logEvent("error", `Upsert failed: ${upsertErr.message}`, {
            external_id: row.external_id,
          });
        } else {
          counts.upserted++;
        }
      } catch (e) {
        counts.errors++;
        const msg = e instanceof Error ? e.message : String(e);
        await logEvent("error", msg, { product: p });
      }
    }

    await supabase
      .from("sync_runs")
      .update({
        status: "finished",
        finished_at: new Date().toISOString(),
        counts,
        error: null,
      })
      .eq("id", runId);

    return NextResponse.json({
      run_id: runId,
      status: "finished",
      counts,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logEvent("error", msg);
    await supabase
      .from("sync_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        counts,
        error: msg,
      })
      .eq("id", runId);

    return NextResponse.json(
      { error: msg, run_id: runId, counts },
      { status: 500 }
    );
  }
}
