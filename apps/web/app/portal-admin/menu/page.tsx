import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { CreateCategoryForm } from "./create-category-form";

export default async function MenuPage() {
  const headersList = await headers();
  const host = headersList.get("x-portal-host") ?? headersList.get("host") ?? "";
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    return (
      <div>
        <h1>Menu</h1>
        <p>Domínio não associado a nenhuma loja. Configure um domínio em Global Admin (Tenants → Lojas → Domínios).</p>
      </div>
    );
  }

  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id, name, sort_order")
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

  const itemsById = new Map((items ?? []).map((i) => [i.id, i]));
  const byCategory = new Map<string, { menu_item_id: string; sort_order: number }[]>();
  for (const ci of categoryItems ?? []) {
    const list = byCategory.get(ci.category_id) ?? [];
    list.push({ menu_item_id: ci.menu_item_id, sort_order: ci.sort_order });
    byCategory.set(ci.category_id, list);
  }
  for (const [, list] of byCategory) list.sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <h1>Menu</h1>
      <p>Categorias e itens da loja (Tenant Admin).</p>
      <p><Link href="/portal-admin/items">Ver todos os itens</Link></p>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Nova categoria</h2>
        <CreateCategoryForm storeId={storeId} />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Categorias e itens</h2>
        {(!categories || categories.length === 0) && <p style={{ color: "#666" }}>Nenhuma categoria.</p>}
        {categories?.map((cat) => (
          <div key={cat.id} style={{ marginBottom: "1.5rem", border: "1px solid #eee", padding: "1rem", borderRadius: "8px" }}>
            <h3 style={{ marginTop: 0 }}>{cat.name}</h3>
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {(byCategory.get(cat.id) ?? []).map(({ menu_item_id }) => {
                const item = itemsById.get(menu_item_id);
                if (!item) return null;
                return (
                  <li key={item.id} style={{ padding: "0.25rem 0" }}>
                    {item.menu_name}
                    {item.menu_price != null && <span style={{ marginLeft: "0.5rem", color: "#666" }}>{Number(item.menu_price).toFixed(2)} €</span>}
                    {item.is_featured && <span style={{ marginLeft: "0.5rem", fontSize: "0.85em" }}>★</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
