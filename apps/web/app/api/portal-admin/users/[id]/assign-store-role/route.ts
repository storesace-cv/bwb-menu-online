import { createClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** POST: assign store role (store_user | store_admin) for a user in a store. Body: { store_id, role_code }. Caller: superadmin or store_admin for that store. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId } = await params;
  if (!userId) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: { store_id?: string; role_code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const storeId = (body.store_id ?? "").trim();
  const roleCode = (body.role_code ?? "").trim();
  if (!storeId) return NextResponse.json({ error: "store_id required" }, { status: 400 });
  if (roleCode !== "store_user" && roleCode !== "store_admin") {
    return NextResponse.json({ error: "role_code must be store_user or store_admin" }, { status: 400 });
  }

  const { data: canAccess } = await supabase.rpc("current_user_can_access_settings", { p_store_id: storeId });
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden: store_admin or superadmin required for this store" }, { status: 403 });
  }

  const { error } = await supabase.rpc("store_assign_role", {
    p_store_id: storeId,
    p_user_id: userId,
    p_role_code: roleCode,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
