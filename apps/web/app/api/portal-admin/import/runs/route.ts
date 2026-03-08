import { createClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET: list import_runs with optional store_id and source_type. Superadmin only. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: isSuper } = await supabase.rpc("current_user_is_superadmin");
  if (!isSuper) {
    return NextResponse.json({ error: "Forbidden: superadmin required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("store_id")?.trim() || null;
  const sourceType = searchParams.get("source_type")?.trim() || null;

  let query = supabase
    .from("import_runs")
    .select("id, source_type, tenant_nif, store_id, file_name, file_hash, imported_by, started_at, finished_at, counts, error")
    .order("started_at", { ascending: false })
    .limit(100);
  if (storeId) query = query.eq("store_id", storeId);
  if (sourceType) query = query.eq("source_type", sourceType);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ runs: data ?? [] });
}
