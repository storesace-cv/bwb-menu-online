import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  netboAuth,
  netboFetchProducts,
  normalizeProduct,
  type NetboConfig,
} from "@/lib/netbo";
import { createClient as createServerClient } from "@/lib/supabase-server";

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

  const config = integration.config as NetboConfig;
  if (!config?.dbname) {
    return NextResponse.json(
      { error: "Invalid NET-bo config (dbname required)" },
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
