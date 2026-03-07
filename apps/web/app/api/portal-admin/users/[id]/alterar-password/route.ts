import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { canManageUser } from "@/lib/portal-admin-can-manage-user";

export const dynamic = "force-dynamic";

/** POST: alterar password do utilizador (admin). Body: { password: string }. Sets renew_password so user must change on next login. */
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

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const password = typeof body.password === "string" ? body.password.trim() : "";
  if (!password || password.length < 6) return NextResponse.json({ error: "password required (min 6 chars)" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Server config missing" }, { status: 500 });

  const admin = createServiceClient(url, serviceKey, { auth: { persistSession: false } });
  const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
    password,
    user_metadata: { must_change_password: true },
  });
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });
  await admin.from("profiles").update({ renew_password: true }).eq("id", userId);
  return NextResponse.json({ ok: true });
}
