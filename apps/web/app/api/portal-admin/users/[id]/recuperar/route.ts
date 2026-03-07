import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { canManageUser } from "@/lib/portal-admin-can-manage-user";

export const dynamic = "force-dynamic";

/** POST: recuperar utilizador anulado (clear soft delete). Caller: superadmin or store_admin for a store the user belongs to. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId } = await params;
  if (!userId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const allowed = await canManageUser(supabase, userId);
  if (!allowed) return NextResponse.json({ error: "Forbidden: cannot manage this user" }, { status: 403 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Server config missing" }, { status: 500 });

  const admin = createServiceClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin.from("profiles").update({ deleted_at: null }).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
