import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeOrResetEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const DEFAULT_PASSWORD = "bwb-menu";

type UserWithBindings = {
  id: string;
  email: string | null;
  created_at: string;
  bindings: { role_code: string; store_id: string | null; store_name: string | null }[];
};

/** GET: list store admins. Query store_id optional. Caller: superadmin. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: isSuper } = await supabase.rpc("current_user_is_superadmin");
  if (!isSuper) return NextResponse.json({ error: "Forbidden: superadmin required" }, { status: 403 });

  const { data: raw } = await supabase.rpc("admin_list_users");
  const all: UserWithBindings[] = Array.isArray(raw) ? raw : [];
  const storeIdParam = request.nextUrl.searchParams.get("store_id") ?? null;

  const storeAdmins = all
    .map((u) => ({
      ...u,
      bindings: (u.bindings || []).filter((b: { role_code: string }) => b.role_code === "store_admin"),
    }))
    .filter((u) => u.bindings.length > 0)
    .filter((u) => !storeIdParam || u.bindings.some((b: { store_id: string | null }) => b.store_id === storeIdParam));

  return NextResponse.json(storeAdmins);
}

/** POST: create or update store admin. Body: { email, store_ids: uuid[] }. Caller: superadmin. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: isSuper } = await supabase.rpc("current_user_is_superadmin");
  if (!isSuper) return NextResponse.json({ error: "Forbidden: superadmin required" }, { status: 403 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Server config missing" }, { status: 500 });

  let body: { email?: string; store_ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const storeIds = Array.isArray(body.store_ids) ? body.store_ids.filter(Boolean) : [];
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  if (storeIds.length === 0) return NextResponse.json({ error: "store_ids required (at least one)" }, { status: 400 });

  const admin = createServiceClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = listData?.users?.find((u) => u.email?.toLowerCase() === email);

  let userId: string;
  if (existing) {
    userId = existing.id;
    await admin.auth.admin.updateUserById(userId, {
      password: DEFAULT_PASSWORD,
      user_metadata: { must_change_password: true },
    });
    await admin.from("profiles").upsert(
      { id: userId, email, renew_password: true },
      { onConflict: "id" }
    );
    await admin.from("user_role_bindings").delete().eq("user_id", userId).eq("role_code", "store_admin");
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    });
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 });
    if (!created?.user) return NextResponse.json({ error: "User not created" }, { status: 500 });
    userId = created.user.id;
    await admin.from("profiles").upsert(
      { id: userId, email, renew_password: true },
      { onConflict: "id" }
    );
  }

  const tenantIds = new Set<string>();
  for (const storeId of storeIds) {
    const { data: store } = await admin.from("stores").select("tenant_id").eq("id", storeId).single();
    const tid = store?.tenant_id ?? null;
    await admin.from("user_role_bindings").insert({
      user_id: userId,
      role_code: "store_admin",
      tenant_id: tid,
      store_id: storeId,
    });
    if (tid) tenantIds.add(tid);
  }

  const portalUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://menu.bwb.pt";
  const loginUrl = `${portalUrl}/portal-admin/login`;
  try {
    await sendWelcomeOrResetEmail({ to: email, portalUrl: loginUrl, isReset: !!existing, passwordDefault: DEFAULT_PASSWORD });
  } catch (e) {
    console.error("Store admin email send failed:", (e as Error).message);
  }

  return NextResponse.json({ id: userId });
}
