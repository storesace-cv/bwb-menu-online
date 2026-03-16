import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";

export const dynamic = "force-dynamic";

function getWeekDates(): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < 7; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

/** GET: programação para um artigo (menu_item_id) para os 7 dias a partir de hoje. Query: menuItemId. */
export async function GET(request: NextRequest) {
  const headersList = await headers();
  const host = getPortalHost(headersList);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });
  if (!storeId) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const menuItemId = request.nextUrl.searchParams.get("menuItemId");
  if (!menuItemId) {
    return NextResponse.json({ error: "Missing menuItemId" }, { status: 400 });
  }

  const { data: item } = await supabase
    .from("menu_items")
    .select("id")
    .eq("id", menuItemId)
    .eq("store_id", storeId)
    .single();
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const dates = getWeekDates();
  const { data: rows } = await supabase
    .from("dish_of_the_day_schedule")
    .select("schedule_date, display_name")
    .eq("menu_item_id", menuItemId)
    .in("schedule_date", dates);

  const schedule: Record<string, string> = {};
  for (const date of dates) {
    schedule[date] = "";
  }
  for (const r of rows ?? []) {
    const d = typeof r.schedule_date === "string" ? r.schedule_date.slice(0, 10) : r.schedule_date;
    schedule[d] = r.display_name ?? "";
  }

  return NextResponse.json({ schedule });
}

/** POST: upsert uma linha da programação. Body: menu_item_id, schedule_date (YYYY-MM-DD), display_name. */
export async function POST(request: NextRequest) {
  const headersList = await headers();
  const host = getPortalHost(headersList);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });
  if (!storeId) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  let body: { menu_item_id?: string; schedule_date?: string; display_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const menuItemId = body.menu_item_id;
  const scheduleDate = body.schedule_date;
  const displayName = (body.display_name ?? "").trim();

  if (!menuItemId || !scheduleDate) {
    return NextResponse.json({ error: "Missing menu_item_id or schedule_date" }, { status: 400 });
  }

  const { data: item } = await supabase
    .from("menu_items")
    .select("id")
    .eq("id", menuItemId)
    .eq("store_id", storeId)
    .single();
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("dish_of_the_day_schedule")
    .upsert(
      { menu_item_id: menuItemId, schedule_date: scheduleDate, display_name: displayName },
      { onConflict: "menu_item_id,schedule_date" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
