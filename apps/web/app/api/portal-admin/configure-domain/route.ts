import { createClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** POST: register nginx reconfig request. Body: { store_id?: string }. Superadmin only. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: isSuper } = await supabase.rpc("current_user_is_superadmin");
  if (!isSuper) {
    return NextResponse.json({ error: "Forbidden: superadmin required" }, { status: 403 });
  }

  let body: { store_id?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const storeId = (body.store_id ?? "").trim() || null;

  let hostnames: string[];
  if (storeId) {
    const { data: domainsRaw } = await supabase.rpc("admin_list_domains", { p_store_id: storeId });
    const list = Array.isArray(domainsRaw) ? domainsRaw : [];
    hostnames = list.map((d: { hostname?: string }) => (d.hostname ?? "").trim()).filter(Boolean);
  } else {
    const { data: raw } = await supabase.rpc("admin_list_all_domain_hostnames");
    hostnames = Array.isArray(raw) ? raw : [];
  }

  const { data: row, error } = await supabase
    .from("nginx_reconfig_jobs")
    .insert({ hostnames, status: "pending" })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, job_id: row?.id, message: "Pedido de reconfiguração nginx registado." });
}

/** GET: list pending jobs (for agent). Query: ?status=pending. Superadmin only. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: isSuper } = await supabase.rpc("current_user_is_superadmin");
  if (!isSuper) {
    return NextResponse.json({ error: "Forbidden: superadmin required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";

  const { data: jobs, error } = await supabase
    .from("nginx_reconfig_jobs")
    .select("id, requested_at, hostnames, status")
    .eq("status", status)
    .order("requested_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ jobs: jobs ?? [] });
}
