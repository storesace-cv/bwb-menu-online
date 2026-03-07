import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { CreateItemForm } from "./create-item-form";
import { ItemsListClient } from "./items-list-client";
import { Card } from "@/components/admin";

export default async function SettingsItemsPage() {
  const headersList = await headers();
  const host = headersList.get("x-portal-host") ?? headersList.get("host") ?? "";
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
  const { data: items } = await supabase
    .from("menu_items")
    .select("id, menu_name, menu_description, menu_price, is_visible, is_featured, sort_order, is_promotion, price_old, take_away, article_type_id")
    .eq("store_id", storeId)
    .order("sort_order");

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
  const { data: mciRows } = itemIds.length > 0
    ? await supabase
        .from("menu_category_items")
        .select("menu_item_id, category_id")
        .in("menu_item_id", itemIds)
    : { data: [] as { menu_item_id: string; category_id: string }[] };

  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
  const sectionById = new Map((sections ?? []).map((s) => [s.id, s]));
  const categoriesByItem = new Map<string, { category_id: string; sort_order: number; has_section: boolean }[]>();
  for (const row of mciRows ?? []) {
    const cat = categoryById.get(row.category_id);
    if (!cat) continue;
    const list = categoriesByItem.get(row.menu_item_id) ?? [];
    list.push({
      category_id: row.category_id,
      sort_order: cat.sort_order ?? 999,
      has_section: !!cat.section_id,
    });
    categoriesByItem.set(row.menu_item_id, list);
  }
  const itemSectionCategory: Record<string, { sectionName: string; categoryName: string }> = {};
  Array.from(categoriesByItem.entries()).forEach(([menuItemId, list]) => {
    list.sort((a, b) => {
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

  const { data: settingsRow } = await supabase
    .from("store_settings")
    .select("settings")
    .eq("store_id", storeId)
    .maybeSingle();
  const settings = (settingsRow?.settings as Record<string, unknown>) ?? {};
  const aiEnabled = !!settings.ai_enabled;

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
          <CreateItemForm storeId={storeId} articleTypes={articleTypes ?? []} aiEnabled={aiEnabled} />
        </Card>
      </section>

      <section>
        <Card>
          <ItemsListClient
            items={items ?? []}
            sections={sections ?? []}
            categories={categories ?? []}
            articleTypes={articleTypes ?? []}
            itemSectionCategory={itemSectionCategory}
          />
        </Card>
      </section>
    </div>
  );
}
