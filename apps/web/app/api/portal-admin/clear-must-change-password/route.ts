import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST: clears must_change_password for the authenticated user.
 * Persists in auth.users so that token refresh and future logins see the flag as false.
 * Used after the user has changed their password on the change-password page.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  const admin = createServiceClient(url, serviceKey, { auth: { persistSession: false } });
  const existing = (user.user_metadata as Record<string, unknown>) ?? {};
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...existing, must_change_password: false },
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return new NextResponse(null, { status: 204 });
}
