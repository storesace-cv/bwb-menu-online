import { createClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET: single import_run by id. Superadmin only. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
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

  const { data, error } = await supabase
    .from("import_runs")
    .select("*")
    .eq("id", runId)
    .single();
  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Import run not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
