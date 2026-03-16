import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";

export const dynamic = "force-dynamic";

/**
 * GET: fetch a chunk of menu items (for "rest" in background load).
 * Query: offset (number), limit (number).
 * Returns { items, itemSectionCategory, itemFamilia } for that chunk only.
 */
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

  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));
  const limit = Math.min(5000, Math.max(1, parseInt(searchParams.get("limit") ?? "5000", 10)));

  const { data: itemsRaw, error: itemsError } = await supabase
    .from("menu_items")
    .select("id, menu_name, menu_description, menu_price, is_visible, is_featured, sort_order, is_promotion, price_old, take_away, article_type_id, prep_minutes, catalog_item_id, catalog_items(name_original)")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("menu_name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const chunkIds = new Set((itemsRaw ?? []).map((i) => i.id));
  if (chunkIds.size === 0) {
    return NextResponse.json({ items: [], itemSectionCategory: {}, itemFamilia: {} });
  }

  const { data: resolvedPricesRows } = await supabase.rpc("get_resolved_prices_for_store", { p_store_id: storeId });
  const resolvedPriceByItemId = new Map<string, number>();
  for (const row of resolvedPricesRows ?? []) {
    if (row.menu_item_id && chunkIds.has(row.menu_item_id) && row.resolved_price != null) {
      resolvedPriceByItemId.set(row.menu_item_id, Number(row.resolved_price));
    }
  }

  const { data: familiaRows } = await supabase.rpc("get_import_familia_for_store", { p_store_id: storeId });
  const itemFamilia: Record<string, { familia: string | null; sub_familia: string | null }> = {};
  for (const i of itemsRaw ?? []) {
    itemFamilia[i.id] = { familia: null, sub_familia: null };
  }
  for (const row of familiaRows ?? []) {
    if (row.menu_item_id && chunkIds.has(row.menu_item_id)) {
      itemFamilia[row.menu_item_id] = {
        familia: row.familia ?? null,
        sub_familia: row.sub_familia ?? null,
      };
    }
  }

  const items = (itemsRaw ?? []).map((i) => {
    const { catalog_items: catalog, ...rest } = i as typeof i & { catalog_items?: { name_original: string | null } | null };
    return {
      ...rest,
      name_original: catalog?.name_original ?? null,
      resolved_price: resolvedPriceByItemId.get(i.id) ?? null,
    };
  });

  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id, name, section_id, sort_order")
    .eq("store_id", storeId)
    .order("sort_order");
  const { data: sections } = await supabase
    .from("menu_sections")
    .select("id, name, sort_order")
    .eq("store_id", storeId)
    .order("sort_order");

  const itemIds = items.map((i) => i.id);
  const MCI_BATCH_SIZE = 50;
  let mciRows: { menu_item_id: string; category_id: string }[] = [];

  const fetchMciBatch = async (chunk: string[]) => {
    const { data, error } = await supabase
      .from("menu_category_items")
      .select("menu_item_id, category_id")
      .in("menu_item_id", chunk);
    return { data, error };
  };
  const isRetryableError = (err: { message?: string } | null) =>
    err != null &&
    (String(err.message).includes("502") || String(err.message).includes("Bad Gateway"));

  for (let i = 0; i < itemIds.length; i += MCI_BATCH_SIZE) {
    const chunk = itemIds.slice(i, i + MCI_BATCH_SIZE);
    let result = await fetchMciBatch(chunk);
    for (const delayMs of [1500, 3000, 5000, 8000]) {
      if (isRetryableError(result.error)) {
        await new Promise((r) => setTimeout(r, delayMs));
        result = await fetchMciBatch(chunk);
      } else break;
    }
    mciRows = mciRows.concat(result.data ?? []);
  }

  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
  const sectionById = new Map((sections ?? []).map((s) => [s.id, s]));
  const categoriesByItem = new Map<string, { category_id: string; sort_order: number; has_section: boolean; cat_name: string }[]>();
  for (const row of mciRows) {
    const cat = categoryById.get(row.category_id);
    if (!cat) continue;
    const list = categoriesByItem.get(row.menu_item_id) ?? [];
    list.push({
      category_id: row.category_id,
      sort_order: cat.sort_order ?? 999,
      has_section: !!cat.section_id,
      cat_name: cat.name,
    });
    categoriesByItem.set(row.menu_item_id, list);
  }
  const itemSectionCategory: Record<string, { sectionName: string; categoryName: string }> = {};
  Array.from(categoriesByItem.entries()).forEach(([menuItemId, list]) => {
    list.sort((a, b) => {
      if (a.cat_name === "Geral" && b.cat_name !== "Geral") return 1;
      if (b.cat_name === "Geral" && a.cat_name !== "Geral") return -1;
      if (a.has_section !== b.has_section) return a.has_section ? -1 : 1;
      return a.sort_order - b.sort_order;
    });
    const firstCatId = list[0]?.category_id;
    const cat = firstCatId ? categoryById.get(firstCatId) : null;
    const sec = cat?.section_id ? sectionById.get(cat.section_id) : null;
    itemSectionCategory[menuItemId] = {
      sectionName: sec?.name ?? "—",
      categoryName: cat?.name ?? "—",
    };
  });
  for (const item of items) {
    if (!(item.id in itemSectionCategory)) {
      itemSectionCategory[item.id] = { sectionName: "—", categoryName: "—" };
    }
  }

  return NextResponse.json({ items, itemSectionCategory, itemFamilia });
}
