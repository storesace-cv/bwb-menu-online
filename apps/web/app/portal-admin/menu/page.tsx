import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import Link from "next/link";
import { type SectionNode } from "./menu-tree-client";
import { MenuItemsTableClient } from "./menu-items-table-client";
import { ExcelImportCard } from "./excel-import-card";
import { Card, MultiSelectDropdown } from "@/components/admin";

function normalizeForSearch(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesText(
  q: string,
  item: { menu_name: string | null; name_original?: string | null; menu_description?: string | null; menu_ingredients?: string | null }
): boolean {
  const norm = normalizeForSearch(q);
  if (!norm) return true;
  const name = normalizeForSearch(item.menu_name ?? item.name_original ?? "");
  const desc = normalizeForSearch(item.menu_description ?? "");
  const ing = normalizeForSearch(item.menu_ingredients ?? "");
  return name.includes(norm) || desc.includes(norm) || ing.includes(norm);
}

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categories?: string | string[]; sections?: string | string[] }>;
}) {
  const params = await searchParams;
  const headersList = await headers();
  const host = getPortalHost(headersList);
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    return (
      <div>
        <nav className="mb-2 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-slate-400">
            <li>
              <Link href="/portal-admin" className="hover:text-slate-200 transition-colors">Portal Admin</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-slate-100" aria-current="page">Menu</li>
          </ol>
        </nav>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Menu</h1>
        <p className="text-slate-400">
          Para gerir o menu, aceda através do subdomínio da loja (ex.: 9999999991.menu.bwb.pt/portal-admin/menu). Em Global Admin pode ver a associação em Tenants → Lojas → coluna Domínios.
        </p>
        <ExcelImportCard />
      </div>
    );
  }

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const categoryFilterIds: string[] = Array.isArray(params.categories)
    ? params.categories.filter((c): c is string => typeof c === "string")
    : typeof params.categories === "string"
      ? [params.categories]
      : [];
  const sectionFilterIds: string[] = Array.isArray(params.sections)
    ? params.sections.filter((s): s is string => typeof s === "string")
    : typeof params.sections === "string"
      ? [params.sections]
      : [];

  const { data: sections } = await supabase
    .from("menu_sections")
    .select("id, name, sort_order")
    .eq("store_id", storeId)
    .order("sort_order");
  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id, name, sort_order, section_id")
    .eq("store_id", storeId)
    .order("sort_order");
  const { data: categoryItems } = await supabase
    .from("menu_category_items")
    .select("category_id, menu_item_id, sort_order");
  const { data: itemsRaw } = await supabase
    .from("menu_items")
    .select("id, menu_name, menu_price, is_featured, sort_order, menu_description, menu_ingredients, catalog_item_id, catalog_items(name_original)")
    .eq("store_id", storeId)
    .order("sort_order");
  const items = (itemsRaw ?? []).map((i) => {
    const { catalog_items: catalog, ...rest } = i as typeof i & { catalog_items?: { name_original: string | null } | null };
    return {
      ...rest,
      name_original: catalog?.name_original ?? null,
      menu_name_display: (rest.menu_name ?? catalog?.name_original ?? "") as string,
    };
  });

  const { data: resolvedPricesRows } = await supabase.rpc("get_resolved_prices_for_store", { p_store_id: storeId });
  const resolvedPriceByItemId = new Map<string, number>();
  for (const row of resolvedPricesRows ?? []) {
    if (row.menu_item_id && row.resolved_price != null) {
      resolvedPriceByItemId.set(row.menu_item_id, Number(row.resolved_price));
    }
  }

  const itemsWithResolvedPrice = items.map((i) => ({
    ...i,
    menu_price_display: i.menu_price ?? resolvedPriceByItemId.get(i.id) ?? null,
  }));
  const itemsById = new Map(itemsWithResolvedPrice.map((i) => [i.id, i]));
  const byCategory = new Map<string, { menu_item_id: string; sort_order: number }[]>();
  const itemIdsInCategory = new Set<string>();
  for (const ci of categoryItems ?? []) {
    itemIdsInCategory.add(ci.menu_item_id);
    const list = byCategory.get(ci.category_id) ?? [];
    list.push({ menu_item_id: ci.menu_item_id, sort_order: ci.sort_order });
    byCategory.set(ci.category_id, list);
  }

  const { data: familiaRows } = await supabase.rpc("get_import_familia_for_store", { p_store_id: storeId });
  const itemFamilia: Record<string, { familia: string | null; sub_familia: string | null }> = {};
  for (const i of itemsWithResolvedPrice) {
    itemFamilia[i.id] = { familia: null, sub_familia: null };
  }
  for (const row of familiaRows ?? []) {
    if (row.menu_item_id && row.menu_item_id in itemFamilia) {
      itemFamilia[row.menu_item_id] = {
        familia: row.familia ?? null,
        sub_familia: row.sub_familia ?? null,
      };
    }
  }

  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
  const sectionById = new Map((sections ?? []).map((s) => [s.id, s]));
  const categoriesByItem = new Map<string, { category_id: string; sort_order: number; has_section: boolean; cat_name: string }[]>();
  for (const ci of categoryItems ?? []) {
    const cat = categoryById.get(ci.category_id);
    if (!cat) continue;
    const list = categoriesByItem.get(ci.menu_item_id) ?? [];
    list.push({
      category_id: ci.category_id,
      sort_order: cat.sort_order ?? 999,
      has_section: !!cat.section_id,
      cat_name: cat.name ?? "",
    });
    categoriesByItem.set(ci.menu_item_id, list);
  }
  const itemSectionCategory: Record<string, { sectionName: string; categoryName: string }> = {};
  for (const [menuItemId, list] of Array.from(categoriesByItem.entries())) {
    const sorted = [...list].sort((a, b) => {
      if (a.cat_name === "Geral" && b.cat_name !== "Geral") return 1;
      if (b.cat_name === "Geral" && a.cat_name !== "Geral") return -1;
      if (a.has_section !== b.has_section) return a.has_section ? -1 : 1;
      return a.sort_order - b.sort_order;
    });
    const firstCatId = sorted[0]?.category_id;
    const cat = firstCatId ? categoryById.get(firstCatId) : null;
    const sec = cat?.section_id ? sectionById.get(cat.section_id) : null;
    itemSectionCategory[menuItemId] = {
      sectionName: sec?.name ?? "—",
      categoryName: cat?.name ?? "—",
    };
  }
  for (const i of itemsWithResolvedPrice) {
    if (!(i.id in itemSectionCategory)) {
      itemSectionCategory[i.id] = { sectionName: "—", categoryName: "—" };
    }
  }

  const uncategorizedItems = itemsWithResolvedPrice.filter((i) => !itemIdsInCategory.has(i.id));

  const categoriesFiltered =
    categoryFilterIds.length > 0
      ? (categories ?? []).filter((c) => categoryFilterIds.includes(c.id))
      : (categories ?? []);

  const tree: SectionNode[] = [];
  const sectionsSorted = [...(sections ?? [])].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt"));
  const noSectionCategories = (categoriesFiltered ?? []).filter((c) => !c.section_id);
  const hasNoSection = noSectionCategories.length > 0;

  const includeNoSection = sectionFilterIds.length === 0 || sectionFilterIds.includes("__none__");
  const sectionsToInclude = new Set(sectionFilterIds.length > 0 ? sectionFilterIds : null);
  const includeUncategorized = sectionFilterIds.length === 0 || sectionFilterIds.includes("__uncategorized__");

  if (uncategorizedItems.length > 0 && includeUncategorized) {
    const entries = q ? uncategorizedItems.filter((i) => matchesText(q, i)) : uncategorizedItems;
    const sorted = [...entries].sort((a, b) => (a.menu_name_display ?? "").localeCompare(b.menu_name_display ?? "", "pt"));
    const uncategorizedNode: SectionNode = {
      sectionKey: "__uncategorized__",
      sectionName: "Por configurar",
      categories: [
        {
          categoryId: "__uncategorized__",
          categoryName: "Artigos sem secção/categoria",
          items: sorted.map((i) => ({
            id: i.id,
            menu_name: i.menu_name_display ?? "",
            menu_price: i.menu_price_display ?? i.menu_price,
            is_featured: i.is_featured,
          })),
        },
      ],
    };
    tree.push(uncategorizedNode);
  }

  type ItemWithOrder = { item: NonNullable<ReturnType<typeof itemsById.get>>; sort_order: number };
  if (hasNoSection && includeNoSection) {
    const catNodes = noSectionCategories
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt"))
      .map((cat) => {
        const withOrder = (byCategory.get(cat.id) ?? [])
          .map(({ menu_item_id, sort_order }) => ({ item: itemsById.get(menu_item_id), sort_order }))
          .filter((e): e is ItemWithOrder => e.item != null);
        const filtered = q ? withOrder.filter((e) => matchesText(q, e.item)) : withOrder;
        const sorted = filtered.sort((a, b) => {
          const c = (a.sort_order ?? 0) - (b.sort_order ?? 0);
          if (c !== 0) return c;
          return (a.item.menu_name_display ?? "").localeCompare(b.item.menu_name_display ?? "", "pt");
        });
        return {
          categoryId: cat.id,
          categoryName: cat.name ?? "",
          items: sorted.map((e) => ({ id: e.item.id, menu_name: e.item.menu_name_display ?? "", menu_price: e.item.menu_price_display ?? e.item.menu_price, is_featured: e.item.is_featured })),
        };
      })
      .filter((n) => n.items.length > 0 || !q);
    if (catNodes.length > 0) {
      tree.push({ sectionKey: "__none__", sectionName: "Sem secção", categories: catNodes });
    }
  }

  for (const sec of sectionsSorted) {
    if (sectionsToInclude !== null && !sectionsToInclude.has(sec.id)) continue;
    const catsInSection = categoriesFiltered.filter((c) => c.section_id === sec.id);
    const catNodes = catsInSection
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt"))
      .map((cat) => {
        const withOrder = (byCategory.get(cat.id) ?? [])
          .map(({ menu_item_id, sort_order }) => ({ item: itemsById.get(menu_item_id), sort_order }))
          .filter((e): e is ItemWithOrder => e.item != null);
        const filtered = q ? withOrder.filter((e) => matchesText(q, e.item)) : withOrder;
        const sorted = filtered.sort((a, b) => {
          const c = (a.sort_order ?? 0) - (b.sort_order ?? 0);
          if (c !== 0) return c;
          return (a.item.menu_name_display ?? "").localeCompare(b.item.menu_name_display ?? "", "pt");
        });
        return {
          categoryId: cat.id,
          categoryName: cat.name ?? "",
          items: sorted.map((e) => ({ id: e.item.id, menu_name: e.item.menu_name_display ?? "", menu_price: e.item.menu_price_display ?? e.item.menu_price, is_featured: e.item.is_featured })),
        };
      })
      .filter((n) => n.items.length > 0 || !q);
    if (catNodes.length > 0) {
      tree.push({ sectionKey: sec.id, sectionName: sec.name ?? "", categories: catNodes });
    }
  }

  const allCategories = (categories ?? []).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt"));
  const sectionOptions = [
    { id: "__uncategorized__", label: "Por configurar" },
    { id: "__none__", label: "Sem secção" },
    ...(sections ?? []).map((s) => ({ id: s.id, label: s.name ?? "" })),
  ];
  const categoryOptions = allCategories.map((c) => ({ id: c.id, label: c.name ?? "" }));

  const { data: storeSettingsRow } = await supabase
    .from("store_settings")
    .select("settings")
    .eq("store_id", storeId)
    .single();
  const settings = storeSettingsRow?.settings as { currency_code?: string } | undefined;
  const currencyCode = settings?.currency_code ?? "€";

  const flatItemIds = new Set(tree.flatMap((s) => s.categories.flatMap((c) => c.items.map((i) => i.id))));
  const flatItems = itemsWithResolvedPrice
    .filter((i) => flatItemIds.has(i.id))
    .map((i) => ({
      id: i.id,
      menu_name_display: i.menu_name_display ?? "",
      menu_price_display: i.menu_price_display ?? null,
    }));

  return (
    <div>
      <nav className="mb-2 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li>
            <Link href="/portal-admin" className="hover:text-slate-200 transition-colors">Portal Admin</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-100" aria-current="page">Menu</li>
        </ol>
      </nav>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Menu</h1>
      <p className="text-slate-400 mb-6">Artigos da loja por família e sub família (dados de importação).</p>

      <section className="mb-6">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-3">Filtros</h2>
          <form method="get" action="/portal-admin/menu" className="flex flex-wrap gap-6 items-end">
            <div className="flex-1 min-w-[12rem]">
              <label htmlFor="menu-q" className="block text-sm font-medium text-slate-300 mb-1">
                Pesquisar no nome, descrição ou ingredientes
              </label>
              <input
                id="menu-q"
                name="q"
                type="text"
                defaultValue={q}
                placeholder="Texto (sem distinção de acentos ou maiúsculas)"
                className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <MultiSelectDropdown
              label="Secções"
              name="sections"
              options={sectionOptions}
              selectedIds={sectionFilterIds}
              placeholder="Todas"
            />
            <MultiSelectDropdown
              label="Categorias"
              name="categories"
              options={categoryOptions}
              selectedIds={categoryFilterIds}
              placeholder="Todas"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm"
            >
              Aplicar
            </button>
            <Link
              href="/portal-admin/menu"
              className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm"
            >
              Limpar
            </Link>
          </form>
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Familias & Sub Familias</h2>
        <MenuItemsTableClient
          items={flatItems}
          itemFamilia={itemFamilia}
          itemSectionCategory={itemSectionCategory}
          sections={sections ?? []}
          categories={categories ?? []}
          currencyCode={currencyCode}
        />
      </section>
    </div>
  );
}
