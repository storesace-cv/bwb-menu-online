import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** POST: create or invite user. Body: { email, password?, role_code, tenant_id?, store_id? }. Caller must be superadmin. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: isSuper } = await supabase.rpc("current_user_is_superadmin");
  if (!isSuper) {
    return NextResponse.json({ error: "Forbidden: superadmin required" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  let body: { email?: string; password?: string; role_code?: string; tenant_id?: string | null; store_id?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = (body.password ?? "").trim();
  const roleCode = (body.role_code ?? "").trim() || null;
  const tenantId = body.tenant_id && String(body.tenant_id).trim() ? String(body.tenant_id).trim() : null;
  const storeId = body.store_id && String(body.store_id).trim() ? String(body.store_id).trim() : null;

  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  if (!roleCode) {
    return NextResponse.json({ error: "role_code required" }, { status: 400 });
  }

  const admin = createServiceClient(url, serviceKey, { auth: { persistSession: false } });

  let newUser: { id: string };
  const withPassword = !!password;
  if (withPassword) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data?.user) {
      return NextResponse.json({ error: "User not created" }, { status: 500 });
    }
    newUser = data.user;
  } else {
    const tempPassword = crypto.randomUUID?.() ?? `temp-${Date.now()}`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data?.user) {
      return NextResponse.json({ error: "User not created" }, { status: 500 });
    }
    newUser = data.user;
  }

  const { error: profileErr } = await admin.from("profiles").upsert(
    { id: newUser.id, email, renew_password: !withPassword },
    { onConflict: "id" }
  );
  if (profileErr) {
    return NextResponse.json({ error: "Profile: " + profileErr.message }, { status: 500 });
  }

  const { error: bindErr } = await admin.from("user_role_bindings").insert({
    user_id: newUser.id,
    role_code: roleCode,
    tenant_id: tenantId || null,
    store_id: storeId || null,
  });
  if (bindErr) {
    if (bindErr.code === "23505") {
      return NextResponse.json({ error: "Role binding already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Binding: " + bindErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: newUser.id });
}
