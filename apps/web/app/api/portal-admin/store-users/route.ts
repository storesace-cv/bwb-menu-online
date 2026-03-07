import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeOrResetEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const DEFAULT_PASSWORD = "bwb-menu";

async function getStoreIdFromRequest(supabase: Awaited<ReturnType<typeof createClient>>, request: NextRequest): Promise<string | null> {
  const queryStoreId = request.nextUrl.searchParams.get("store_id") ?? null;
  if (queryStoreId) return queryStoreId;
  const host = request.headers.get("host") ?? request.headers.get("x-forwarded-host") ?? "";
  const { data } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });
  return data ?? null;
}

/** GET: list store users for a store. store_id from query or host. Caller: store_admin for that store or superadmin. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeId = await getStoreIdFromRequest(supabase, request);
  if (!storeId) return NextResponse.json({ error: "store_id required (query or host)" }, { status: 400 });

  const { data: canAccess } = await supabase.rpc("current_user_can_access_settings", { p_store_id: storeId });
  if (!canAccess) return NextResponse.json({ error: "Forbidden: store_admin or superadmin required for this store" }, { status: 403 });

  const { data: raw, error } = await supabase.rpc("admin_list_users_by_role_for_store", {
    p_role_code: "store_user",
    p_store_id: storeId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const list = Array.isArray(raw) ? raw : [];
  return NextResponse.json(list);
}

/** POST: create or update store user. Body: { email, store_ids?, display_name? }. Default store_ids = current store. Caller: store_admin/superadmin. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const defaultStoreId = await getStoreIdFromRequest(supabase, request);
  if (!defaultStoreId) return NextResponse.json({ error: "store_id required (query or host)" }, { status: 400 });

  const { data: canAccess } = await supabase.rpc("current_user_can_access_settings", { p_store_id: defaultStoreId });
  if (!canAccess) return NextResponse.json({ error: "Forbidden: store_admin or superadmin required" }, { status: 403 });

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
  const storeIds = Array.isArray(body.store_ids) && body.store_ids.length > 0 ? body.store_ids.filter(Boolean) : [defaultStoreId];

  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  for (const sid of storeIds) {
    const { data: ok } = await supabase.rpc("current_user_can_access_settings", { p_store_id: sid });
    if (!ok) return NextResponse.json({ error: "Forbidden: no access to one or more stores" }, { status: 403 });
  }

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
    await admin.from("profiles").upsert({ id: userId, email, renew_password: true }, { onConflict: "id" });
    await admin.from("user_role_bindings").delete().eq("user_id", userId).eq("role_code", "store_user");
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
    await admin.from("profiles").upsert({ id: userId, email, renew_password: true }, { onConflict: "id" });
  }

  for (const storeId of storeIds) {
    const { data: store } = await admin.from("stores").select("tenant_id").eq("id", storeId).single();
    await admin.from("user_role_bindings").insert({
      user_id: userId,
      role_code: "store_user",
      tenant_id: store?.tenant_id ?? null,
      store_id: storeId,
    });
  }

  const host = request.headers.get("host") ?? request.headers.get("x-forwarded-host") ?? "";
  const scheme = request.headers.get("x-forwarded-proto") === "https" ? "https" : "http";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? (host ? `${scheme}://${host}` : "https://menu.bwb.pt");
  const portalUrl = baseUrl.replace(/\/$/, "") + "/portal-admin/login";

  try {
    await sendWelcomeOrResetEmail({ to: email, portalUrl, isReset: !!existing, passwordDefault: DEFAULT_PASSWORD });
  } catch (e) {
    console.error("Store user email send failed:", (e as Error).message);
  }

  return NextResponse.json({ id: userId });
}
