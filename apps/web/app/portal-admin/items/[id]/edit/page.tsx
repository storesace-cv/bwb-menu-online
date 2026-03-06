import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { EditItemForm } from "../../edit-item-form";

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headersList = await headers();
  const host = headersList.get("x-portal-host") ?? headersList.get("host") ?? "";
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    return (
      <div>
        <h1>Editar item</h1>
        <p>Domínio não associado a nenhuma loja.</p>
        <p><Link href="/portal-admin/items">← Voltar aos itens</Link></p>
      </div>
    );
  }

  const { data: item, error } = await supabase
    .from("menu_items")
    .select("id, menu_name, menu_description, menu_price, sort_order, article_type_id, is_promotion, price_old, take_away, menu_ingredients, is_visible, is_featured")
    .eq("id", id)
    .eq("store_id", storeId)
    .single();

  if (error || !item) {
    return (
      <div>
        <h1>Editar item</h1>
        <p>Item não encontrado ou sem acesso.</p>
        <p><Link href="/portal-admin/items">← Voltar aos itens</Link></p>
      </div>
    );
  }

  const { data: articleTypes } = await supabase
    .from("article_types")
    .select("id, name, icon_code")
    .eq("store_id", storeId)
    .order("sort_order");

  return (
    <div>
      <h1>Editar item</h1>
      <p><Link href="/portal-admin/items">← Voltar aos itens</Link></p>
      <section style={{ marginTop: "1.5rem" }}>
        <EditItemForm item={item} articleTypes={articleTypes ?? []} />
      </section>
    </div>
  );
}
