import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeOrResetEmail } from "@/lib/mailer";
import { canManageUser } from "@/lib/portal-admin-can-manage-user";

export const dynamic = "force-dynamic";

const DEFAULT_PASSWORD = "bwb-menu";

/** POST: reset user password to default, set renew_password, send email. Body: { portal_url? }. Caller: superadmin or store_admin for a store the user belongs to. */
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

  let body: { portal_url?: string };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const portalUrl =
    (body.portal_url ?? "").trim() ||
    (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://menu.bwb.pt") + "/portal-admin/login";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Server config missing" }, { status: 500 });

  const admin = createServiceClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: userData, error: updateErr } = await admin.auth.admin.updateUserById(userId, {
    password: DEFAULT_PASSWORD,
    user_metadata: { must_change_password: true },
  });
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });
  const email = userData?.user?.email;
  if (!email) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await admin.from("profiles").update({ renew_password: true }).eq("id", userId);

  try {
    await sendWelcomeOrResetEmail({ to: email, portalUrl, isReset: true, passwordDefault: DEFAULT_PASSWORD });
  } catch (e) {
    console.error("Reset password email send failed:", (e as Error).message);
  }

  return NextResponse.json({ ok: true });
}
