import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeOrResetEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const DEFAULT_PASSWORD = "bwb-menu";

/** POST: reset store admin password to default, set renew_password, send email. Body: { user_id, portal_url? }. Caller: superadmin. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: isSuper } = await supabase.rpc("current_user_is_superadmin");
  if (!isSuper) return NextResponse.json({ error: "Forbidden: superadmin required" }, { status: 403 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Server config missing" }, { status: 500 });

  let body: { user_id?: string; portal_url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const userId = (body.user_id ?? "").trim();
  const portalUrl = (body.portal_url ?? "").trim() || (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://menu.bwb.pt") + "/portal-admin/login";

  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

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
    console.error("Store admin reset email send failed:", (e as Error).message);
  }

  return NextResponse.json({ ok: true });
}
