import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { MenuTreeClient, type SectionNode } from "./menu-tree-client";
import { Card } from "@/components/admin";

function normalizeForSearch(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesText(
  q: string,
  item: { menu_name: string | null; menu_description?: string | null; menu_ingredients?: string | null }
): boolean {
  const norm = normalizeForSearch(q);
  if (!norm) return true;
  const name = normalizeForSearch(item.menu_name ?? "");
  const desc = normalizeForSearch(item.menu_description ?? "");
  const ing = normalizeForSearch(item.menu_ingredients ?? "");
  return name.includes(norm) || desc.includes(norm) || ing.includes(norm);
}

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categories?: string | string[] }>;
}) {
  const params = await searchParams;
  const headersList = await headers();
  const host = headersList.get("x-portal-host") ?? headersList.get("host") ?? "";
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Menu</h1>
        <p className="text-slate-400">
          Para gerir o menu, aceda através do subdomínio da loja (ex.: 9999999991.menu.bwb.pt/portal-admin/menu). Em Global Admin pode ver a associação em Tenants → Lojas → coluna Domínios.
        </p>
      </div>
    );
  }

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const categoryFilterIds: string[] = Array.isArray(params.categories)
    ? params.categories.filter((c): c is string => typeof c === "string")
    : typeof params.categories === "string"
      ? [params.categories]
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
  const { data: items } = await supabase
    .from("menu_items")
    .select("id, menu_name, menu_price, is_featured, sort_order, menu_description, menu_ingredients")
    .eq("store_id", storeId)
    .order("sort_order");

  const sectionById = new Map((sections ?? []).map((s) => [s.id, s]));
  const itemsById = new Map((items ?? []).map((i) => [i.id, i]));
  const byCategory = new Map<string, { menu_item_id: string; sort_order: number }[]>();
  for (const ci of categoryItems ?? []) {
    const list = byCategory.get(ci.category_id) ?? [];
    list.push({ menu_item_id: ci.menu_item_id, sort_order: ci.sort_order });
    byCategory.set(ci.category_id, list);
  }

  const categoriesFiltered =
    categoryFilterIds.length > 0
      ? (categories ?? []).filter((c) => categoryFilterIds.includes(c.id))
      : (categories ?? []);

  const tree: SectionNode[] = [];
  const sectionsSorted = [...(sections ?? [])].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt"));
  const noSectionCategories = (categoriesFiltered ?? []).filter((c) => !c.section_id);
  const hasNoSection = noSectionCategories.length > 0;

  if (hasNoSection) {
    const catNodes = noSectionCategories
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt"))
      .map((cat) => {
        const entries = (byCategory.get(cat.id) ?? [])
          .map(({ menu_item_id }) => itemsById.get(menu_item_id))
          .filter(Boolean) as { id: string; menu_name: string | null; menu_price: number | null; is_featured: boolean; menu_description?: string | null; menu_ingredients?: string | null }[];
        const filtered = q ? entries.filter((i) => matchesText(q, i)) : entries;
        const sorted = filtered.sort((a, b) => (a.menu_name ?? "").localeCompare(b.menu_name ?? "", "pt"));
        return {
          categoryId: cat.id,
          categoryName: cat.name ?? "",
          items: sorted.map((i) => ({ id: i.id, menu_name: i.menu_name ?? "", menu_price: i.menu_price, is_featured: i.is_featured })),
        };
      })
      .filter((n) => n.items.length > 0 || !q);
    if (catNodes.length > 0) {
      tree.push({ sectionKey: "__none__", sectionName: "Sem secção", categories: catNodes });
    }
  }

  for (const sec of sectionsSorted) {
    const catsInSection = categoriesFiltered.filter((c) => c.section_id === sec.id);
    const catNodes = catsInSection
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt"))
      .map((cat) => {
        const entries = (byCategory.get(cat.id) ?? [])
          .map(({ menu_item_id }) => itemsById.get(menu_item_id))
          .filter(Boolean) as { id: string; menu_name: string | null; menu_price: number | null; is_featured: boolean; menu_description?: string | null; menu_ingredients?: string | null }[];
        const filtered = q ? entries.filter((i) => matchesText(q, i)) : entries;
        const sorted = filtered.sort((a, b) => (a.menu_name ?? "").localeCompare(b.menu_name ?? "", "pt"));
        return {
          categoryId: cat.id,
          categoryName: cat.name ?? "",
          items: sorted.map((i) => ({ id: i.id, menu_name: i.menu_name ?? "", menu_price: i.menu_price, is_featured: i.is_featured })),
        };
      })
      .filter((n) => n.items.length > 0 || !q);
    if (catNodes.length > 0) {
      tree.push({ sectionKey: sec.id, sectionName: sec.name ?? "", categories: catNodes });
    }
  }

  const allCategories = (categories ?? []).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt"));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Menu</h1>
      <p className="text-slate-400 mb-2">Categorias e itens da loja (Secção → Categoria → Artigo).</p>
      <p className="mb-6">
        <Link href="/portal-admin/settings/items" className="text-emerald-400 hover:text-emerald-300">Ver todos os itens</Link>
        {" · "}
        <Link href="/portal-admin/article-types" className="text-emerald-400 hover:text-emerald-300">Tipos de artigo</Link>
        {" · "}
        <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">Definições</Link>
      </p>

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
            <div className="flex flex-wrap gap-4 items-center">
              <span className="text-sm text-slate-400">Categorias:</span>
              {allCategories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name="categories"
                    value={cat.id}
                    defaultChecked={categoryFilterIds.includes(cat.id)}
                    className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
                  />
                  {cat.name}
                </label>
              ))}
            </div>
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
        <h2 className="text-lg font-medium text-slate-200 mb-4">Categorias e itens</h2>
        {tree.length === 0 ? (
          <p className="text-slate-500">Nenhuma secção ou categoria com itens. Ajuste os filtros ou crie secções e categorias em Definições.</p>
        ) : (
          <MenuTreeClient tree={tree} defaultExpanded={true} />
        )}
      </section>
    </div>
  );
}
