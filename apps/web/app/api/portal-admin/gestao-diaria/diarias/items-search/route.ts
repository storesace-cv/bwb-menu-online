import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";

export const dynamic = "force-dynamic";

/** GET: pesquisa artigos da loja por nome (para "Inserir item"). Query: q (opcional), limit (default 20). */
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

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const limit = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10)));

  let query = supabase
    .from("menu_items")
    .select("id, menu_name, catalog_items(name_original)")
    .eq("store_id", storeId)
    .order("menu_name", { ascending: true })
    .limit(limit);

  if (q.length > 0) {
    query = query.ilike("menu_name", `%${q}%`);
  }
  const { data: raw, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (raw ?? []).map((i: unknown) => {
    const row = i as { id: string; menu_name: string | null; catalog_items?: { name_original: string | null } | { name_original: string | null }[] | null };
    const catalog = Array.isArray(row.catalog_items) ? row.catalog_items[0] : row.catalog_items;
    const name = (row.menu_name ?? catalog?.name_original ?? "").trim() || "";
    return { id: row.id, menu_name: row.menu_name ?? null, name_original: catalog?.name_original ?? null, display_name: name || undefined };
  });

  if (q.length > 0) {
    const norm = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const matches = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(norm);
    items.sort((a, b) => {
      const an = (a.menu_name ?? a.name_original ?? "").toLowerCase();
      const bn = (b.menu_name ?? b.name_original ?? "").toLowerCase();
      const aMatch = matches(an);
      const bMatch = matches(bn);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return an.localeCompare(bn);
    });
  }

  return NextResponse.json({ items });
}
