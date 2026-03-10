import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import Link from "next/link";
import { portalDebugLog } from "@/lib/portal-debug-log";
import { CreateItemForm } from "./create-item-form";
import { ItemsListClient } from "./items-list-client";
import { Card } from "@/components/admin";

export const dynamic = "force-dynamic";

const INITIAL_ITEMS_LIMIT = 150;

export default async function SettingsItemsPage() {
  const headersList = await headers();
  const host = getPortalHost(headersList);

  try {
    const supabase = await createClient();
    const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

    if (!storeId) {
      return (
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 mb-2">Gestão de Artigos</h1>
          <p className="text-slate-400">Domínio não associado a nenhuma loja.</p>
          <p className="mt-4"><Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</Link></p>
        </div>
      );
    }

    const { data: articleTypes } = await supabase
    .from("article_types")
    .select("id, name, icon_code")
    .eq("store_id", storeId)
    .order("sort_order");

  const { count: totalCount } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);

  const { data: itemsRaw } = await supabase
    .from("menu_items")
    .select("id, menu_name, menu_description, menu_price, is_visible, is_featured, sort_order, is_promotion, price_old, take_away, article_type_id, prep_minutes, catalog_item_id, catalog_items(name_original)")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("menu_name", { ascending: true })
    .range(0, INITIAL_ITEMS_LIMIT - 1);

  const { data: resolvedPricesRows } = await supabase.rpc("get_resolved_prices_for_store", { p_store_id: storeId });
  const resolvedPriceByItemId = new Map<string, number>();
  const initialIds = new Set((itemsRaw ?? []).map((i) => i.id));
  for (const row of resolvedPricesRows ?? []) {
    if (row.menu_item_id && initialIds.has(row.menu_item_id) && row.resolved_price != null) {
      resolvedPriceByItemId.set(row.menu_item_id, Number(row.resolved_price));
    }
  }

  const { data: familiaRows } = await supabase.rpc("get_import_familia_for_store", { p_store_id: storeId });
  const itemFamilia: Record<string, { familia: string | null; sub_familia: string | null }> = {};
  for (const i of itemsRaw ?? []) {
    itemFamilia[i.id] = { familia: null, sub_familia: null };
  }
  for (const row of familiaRows ?? []) {
    if (row.menu_item_id && initialIds.has(row.menu_item_id)) {
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

  const { data: sections } = await supabase
    .from("menu_sections")
    .select("id, name, sort_order")
    .eq("store_id", storeId)
    .order("sort_order");
  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id, name, section_id, sort_order")
    .eq("store_id", storeId)
    .order("sort_order");

  const itemIds = (items ?? []).map((i) => i.id);
  const MCI_BATCH_SIZE = 200;
  let mciRows: { menu_item_id: string; category_id: string }[] = [];
  let firstBatchError: string | null = null;
  let firstBatchIndex: number | null = null;

  const fetchMciBatch = async (chunk: string[]) => {
    const { data, error } = await supabase
      .from("menu_category_items")
      .select("menu_item_id, category_id")
      .in("menu_item_id", chunk);
    return { data, error };
  };

  if (itemIds.length > 0) {
    for (let i = 0; i < itemIds.length; i += MCI_BATCH_SIZE) {
      const chunk = itemIds.slice(i, i + MCI_BATCH_SIZE);
      const batchIndex = Math.floor(i / MCI_BATCH_SIZE);
      let result = await fetchMciBatch(chunk);
      const isRetryable =
        result.error != null &&
        (String(result.error.message).includes("502") || String(result.error.message).includes("Bad Gateway"));
      if (isRetryable) {
        await new Promise((r) => setTimeout(r, 1500));
        result = await fetchMciBatch(chunk);
      }
      const batchError = result.error;
      if (batchError != null && firstBatchError == null) {
        firstBatchError = batchError.message;
        firstBatchIndex = batchIndex;
      }
      mciRows = mciRows.concat(result.data ?? []);
    }
  }
  portalDebugLog("settings_items_mci", {
    itemIdsCount: itemIds.length,
    mciRowsCount: mciRows.length,
    ...(firstBatchError != null ? { batchError: firstBatchError, batchIndex: firstBatchIndex } : {}),
  });

  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
  const sectionById = new Map((sections ?? []).map((s) => [s.id, s]));
  const categoriesByItem = new Map<string, { category_id: string; sort_order: number; has_section: boolean; cat_name: string }[]>();
  for (const row of mciRows ?? []) {
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
  for (const item of items ?? []) {
    if (!(item.id in itemSectionCategory)) {
      itemSectionCategory[item.id] = { sectionName: "—", categoryName: "—" };
    }
  }

  const { data: aiEnabledRpc } = await supabase.rpc("store_can_use_ai_description", {
    p_store_id: storeId,
  });
  const aiEnabled = !!aiEnabledRpc;

  const { data: allergens } = await supabase
    .from("allergens")
    .select("id, code, name_i18n, severity, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Gestão de Artigos</h1>
      <p className="mb-6">
        <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</Link>
        {" · "}
        <Link href="/portal-admin/menu" className="text-emerald-400 hover:text-emerald-300">Menu (categorias)</Link>
        {" · "}
        <Link href="/portal-admin/article-types" className="text-emerald-400 hover:text-emerald-300">Tipos de artigo</Link>
      </p>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Novo item</h2>
          <CreateItemForm storeId={storeId} articleTypes={articleTypes ?? []} aiEnabled={aiEnabled} allergens={allergens ?? []} />
        </Card>
      </section>

      <section>
        <Card>
          <ItemsListClient
            items={items ?? []}
            totalCount={totalCount ?? 0}
            hasMore={(totalCount ?? 0) > (items?.length ?? 0)}
            sections={sections ?? []}
            categories={categories ?? []}
            articleTypes={articleTypes ?? []}
            itemSectionCategory={itemSectionCategory}
            itemFamilia={itemFamilia}
          />
        </Card>
      </section>
    </div>
  );
  } catch (e) {
    const err = e as Error & { digest?: string };
    if (err?.digest?.startsWith?.("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") throw e;
    if (err?.digest?.startsWith?.("NEXT_NOT_FOUND")) throw e;
    console.error("[portal-admin settings/items]", err);
    portalDebugLog("settings_items_page", { error: String(err) });
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Gestão de Artigos</h1>
        <p className="text-slate-400 mb-4">Não foi possível carregar os dados. Tente novamente.</p>
        <p className="flex flex-wrap gap-3">
          <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</Link>
          <span className="text-slate-500">·</span>
          <Link href="/portal-admin/settings/items" className="text-emerald-400 hover:text-emerald-300">Tentar de novo</Link>
        </p>
      </div>
    );
  }
}
