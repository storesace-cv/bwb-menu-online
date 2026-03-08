import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET: list stores with tenant_nif and hostname for Excel import UI. Superadmin only. */
export async function GET() {
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

  const { data, error } = await supabase.rpc("admin_list_stores_for_import");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const list = Array.isArray(data) ? data : [];
  return NextResponse.json({ stores: list });
}
