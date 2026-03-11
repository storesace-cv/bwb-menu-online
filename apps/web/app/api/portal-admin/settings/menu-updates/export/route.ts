import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import { buildMenuUpdatesWorkbook, type MenuExcelRow } from "@/lib/menu-excel-export";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 10000;

export async function GET() {
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

  const { data: hasAccess } = await supabase.rpc("user_has_store_access", { p_store_id: storeId });
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: storeRow } = await supabase
    .from("stores")
    .select("id, name, tenant_id")
    .eq("id", storeId)
    .single();
  if (!storeRow) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("nif, name")
    .eq("id", (storeRow as { tenant_id: string }).tenant_id)
    .single();
  const tenantLabel = (tenantRow as { nif?: string; name?: string } | null)?.name?.trim() || (tenantRow as { nif?: string } | null)?.nif || "Tenant";
  const storeLabel = (storeRow as { name?: string }).name?.trim() || host || storeId;

  const { data: articleTypes } = await supabase
    .from("article_types")
    .select("id, name")
    .eq("store_id", storeId)
    .order("sort_order");
  const typeNames = (articleTypes ?? []).map((t) => (t as { name: string }).name);

  const { data: sections } = await supabase
    .from("menu_sections")
    .select("id, name")
    .eq("store_id", storeId)
    .order("sort_order");
  const sectionNames = (sections ?? []).map((s) => (s as { name: string }).name);

  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id, name, section_id, sort_order")
    .eq("store_id", storeId)
    .order("sort_order");
  const categoryNames = (categories ?? []).map((c) => (c as { name: string }).name);

  const { data: itemsRaw } = await supabase
    .from("menu_items")
    .select("id, item_code, menu_name, menu_price, is_visible, is_featured, sort_order, is_promotion, price_old, take_away, article_type_id, prep_minutes, catalog_item_id, catalog_items(name_original)")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("menu_name", { ascending: true })
    .limit(MAX_ITEMS);

  if (!itemsRaw || itemsRaw.length === 0) {
    const buffer = await buildMenuUpdatesWorkbook({
      tenantLabel,
      storeLabel,
      rows: [],
      typeNames,
      sectionNames,
      categoryNames,
    });
    const filename = `menu-actualizacoes-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const itemIds = itemsRaw.map((i) => i.id);
  const { data: resolvedPricesRows } = await supabase.rpc("get_resolved_prices_for_store", { p_store_id: storeId });
  const resolvedPriceByItemId = new Map<string, number>();
  for (const row of resolvedPricesRows ?? []) {
    if (row.menu_item_id && itemIds.includes(row.menu_item_id) && row.resolved_price != null) {
      resolvedPriceByItemId.set(row.menu_item_id, Number(row.resolved_price));
    }
  }

  const { data: familiaRows } = await supabase.rpc("get_import_familia_for_store", { p_store_id: storeId });
  const itemFamilia: Record<string, { familia: string | null; sub_familia: string | null }> = {};
  for (const i of itemsRaw) {
    itemFamilia[i.id] = { familia: null, sub_familia: null };
  }
  for (const row of familiaRows ?? []) {
    if (row.menu_item_id && itemFamilia[row.menu_item_id] !== undefined) {
      itemFamilia[row.menu_item_id] = {
        familia: row.familia ?? null,
        sub_familia: row.sub_familia ?? null,
      };
    }
  }

  const typeById = new Map((articleTypes ?? []).map((t) => [(t as { id: string }).id, (t as { name: string }).name]));
  const categoryById = new Map((categories ?? []).map((c) => [(c as { id: string }).id, c as { id: string; name: string; section_id: string | null; sort_order?: number | null }]));
  const sectionById = new Map((sections ?? []).map((s) => [(s as { id: string }).id, (s as { name: string }).name]));

  const MCI_BATCH = 200;
  let mciRows: { menu_item_id: string; category_id: string }[] = [];
  for (let i = 0; i < itemIds.length; i += MCI_BATCH) {
    const chunk = itemIds.slice(i, i + MCI_BATCH);
    const { data } = await supabase
      .from("menu_category_items")
      .select("menu_item_id, category_id")
      .in("menu_item_id", chunk);
    mciRows = mciRows.concat(data ?? []);
  }

  const categoriesByItem = new Map<string, { category_id: string; sort_order: number; cat_name: string }[]>();
  for (const row of mciRows) {
    const cat = categoryById.get(row.category_id);
    if (!cat) continue;
    const list = categoriesByItem.get(row.menu_item_id) ?? [];
    list.push({ category_id: row.category_id, sort_order: cat.sort_order ?? 999, cat_name: cat.name });
    categoriesByItem.set(row.menu_item_id, list);
  }
  const itemSectionCategory: Record<string, { sectionName: string; categoryName: string }> = {};
  for (const [menuItemId, list] of Array.from(categoriesByItem.entries())) {
    list.sort((a, b) => a.sort_order - b.sort_order);
    const firstCatId = list[0]?.category_id;
    const cat = firstCatId ? categoryById.get(firstCatId) : null;
    const sec = cat?.section_id ? sectionById.get(cat.section_id) : null;
    itemSectionCategory[menuItemId] = {
      sectionName: sec ?? "—",
      categoryName: cat?.name ?? "—",
    };
  }
  for (const item of itemsRaw) {
    if (!(item.id in itemSectionCategory)) {
      itemSectionCategory[item.id] = { sectionName: "—", categoryName: "—" };
    }
  }

  const rows: MenuExcelRow[] = itemsRaw.map((i) => {
    const rawCatalog = (i as { catalog_items?: { name_original: string | null } | { name_original: string | null }[] | null }).catalog_items;
    const catalog = Array.isArray(rawCatalog) ? rawCatalog[0] ?? null : rawCatalog;
    const displayName = (i as { menu_name?: string | null }).menu_name?.trim() || catalog?.name_original?.trim() || "";
    const price = resolvedPriceByItemId.get(i.id) ?? (i as { menu_price?: number | null }).menu_price ?? null;
    const typeName = (i as { article_type_id?: string | null }).article_type_id ? typeById.get((i as { article_type_id: string }).article_type_id) ?? "" : "";
    const fam = itemFamilia[i.id];
    const secCat = itemSectionCategory[i.id];
    return {
      item_code: (i as { item_code?: string | null }).item_code ?? null,
      menu_name: displayName || null,
      price,
      type_name: typeName,
      familia: fam?.familia ?? "—",
      sub_familia: fam?.sub_familia ?? "—",
      section_name: secCat?.sectionName ?? "—",
      category_name: secCat?.categoryName ?? "—",
      promo: (i as { is_promotion?: boolean }).is_promotion ? "Sim" : "Não",
      ta: (i as { take_away?: boolean }).take_away ? "Sim" : "Não",
      prep_minutes: (i as { prep_minutes?: number | null }).prep_minutes ?? null,
      sort_order: (i as { sort_order?: number | null }).sort_order ?? null,
      is_visible: (i as { is_visible?: boolean }).is_visible ? "Sim" : "Não",
      is_featured: (i as { is_featured?: boolean }).is_featured ? "Sim" : "Não",
    };
  });

  const buffer = await buildMenuUpdatesWorkbook({
    tenantLabel,
    storeLabel,
    rows,
    typeNames,
    sectionNames,
    categoryNames,
  });

  const filename = `menu-actualizacoes-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
