import { createClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const host = request.headers.get("host") ?? request.headers.get("x-forwarded-host") ?? "";
  const scheme = request.headers.get("x-forwarded-proto") === "https" ? "https" : "http";
  const baseUrl = host ? `${scheme}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "https://menu.bwb.pt").replace(/\/$/, "");
  const loginUrl = `${baseUrl.replace(/\/$/, "")}/portal-admin/login`;

  return NextResponse.redirect(new URL(loginUrl), 302);
}
