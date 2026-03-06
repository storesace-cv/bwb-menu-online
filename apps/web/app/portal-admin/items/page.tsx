import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { CreateItemForm } from "./create-item-form";
import { MenuIcon } from "@/components/menu-icons";

export default async function ItemsPage() {
  const headersList = await headers();
  const host = headersList.get("x-portal-host") ?? headersList.get("host") ?? "";
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    return (
      <div>
        <h1>Itens</h1>
        <p>Domínio não associado a nenhuma loja.</p>
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
  const { data: typesRows } = await supabase
    .from("article_types")
    .select("id, name, icon_code")
    .eq("store_id", storeId);
  const typeById = new Map((typesRows ?? []).map((t) => [t.id, t]));

  return (
    <div>
      <h1>Itens do menu</h1>
      <p><Link href="/portal-admin/menu">← Menu (categorias)</Link> · <Link href="/portal-admin/article-types">Tipos de artigo</Link></p>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Novo item</h2>
        <CreateItemForm storeId={storeId} articleTypes={articleTypes ?? []} />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Lista</h2>
        <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "800px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Nome</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Preço</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Tipo</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Promo</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>TA</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Ordem</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Visível</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Destaque</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((i) => {
              const at = i.article_type_id ? typeById.get(i.article_type_id) : null;
              return (
                <tr key={i.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.5rem" }}>{i.menu_name ?? "—"}</td>
                  <td style={{ padding: "0.5rem" }}>{i.menu_price != null ? `${Number(i.menu_price).toFixed(2)} €` : "—"}</td>
                  <td style={{ padding: "0.5rem" }}>{at ? <span title={at.name}><MenuIcon code={at.icon_code} size={18} /></span> : "—"}</td>
                  <td style={{ padding: "0.5rem" }}>{i.is_promotion ? (i.price_old != null ? `${i.price_old}→` : "Sim") : "—"}</td>
                  <td style={{ padding: "0.5rem" }}>{i.take_away ? "Sim" : "—"}</td>
                  <td style={{ padding: "0.5rem" }}>{i.sort_order}</td>
                  <td style={{ padding: "0.5rem" }}>{i.is_visible ? "Sim" : "Não"}</td>
                  <td style={{ padding: "0.5rem" }}>{i.is_featured ? "★" : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(!items || items.length === 0) && <p style={{ color: "#666" }}>Nenhum item.</p>}
      </section>
    </div>
  );
}
