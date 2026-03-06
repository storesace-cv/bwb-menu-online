import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { CreateCategoryForm } from "./create-category-form";
import { CreateSectionForm } from "./create-section-form";
import { Card } from "@/components/admin";

export default async function MenuPage() {
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
    .select("id, menu_name, menu_price, is_featured, sort_order")
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
  Array.from(byCategory.values()).forEach((list) => list.sort((a, b) => a.sort_order - b.sort_order));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Menu</h1>
      <p className="text-slate-400 mb-2">Categorias e itens da loja (Tenant Admin).</p>
      <p className="mb-6">
        <Link href="/portal-admin/items" className="text-emerald-400 hover:text-emerald-300">Ver todos os itens</Link>
        {" · "}
        <Link href="/portal-admin/article-types" className="text-emerald-400 hover:text-emerald-300">Tipos de artigo</Link>
      </p>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-2">Secções</h2>
          <p className="text-slate-500 text-sm mb-4">Secção é um nível acima de categoria (ex.: Snack-Bar, Restaurante).</p>
          <CreateSectionForm storeId={storeId} />
          {sections && sections.length > 0 && (
            <ul className="list-none pl-0 mt-4 space-y-1">
              {sections.map((s) => (
                <li key={s.id} className="text-slate-200 py-1">{s.name}</li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Nova categoria</h2>
          <CreateCategoryForm storeId={storeId} sections={sections ?? []} />
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Categorias e itens</h2>
        {(!categories || categories.length === 0) && <p className="text-slate-500">Nenhuma categoria.</p>}
        {categories?.map((cat) => (
          <Card key={cat.id} className="mb-4">
            <h3 className="text-slate-100 font-medium mt-0">
              {cat.name}
              {cat.section_id && (
                <span className="font-normal text-slate-500 text-sm ml-1">
                  ({sectionById.get(cat.section_id)?.name ?? "—"})
                </span>
              )}
            </h3>
            <ul className="list-none pl-0 space-y-1">
              {(byCategory.get(cat.id) ?? []).map(({ menu_item_id }) => {
                const item = itemsById.get(menu_item_id);
                if (!item) return null;
                return (
                  <li key={item.id} className="text-slate-200 py-1">
                    {item.menu_name}
                    {item.menu_price != null && <span className="ml-2 text-slate-500">{Number(item.menu_price).toFixed(2)} €</span>}
                    {item.is_featured && <span className="ml-2 text-amber-400">★</span>}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </section>
    </div>
  );
}
