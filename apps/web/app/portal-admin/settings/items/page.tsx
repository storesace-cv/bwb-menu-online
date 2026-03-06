import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { CreateItemForm } from "./create-item-form";
import { ItemActions } from "./item-actions";
import { MenuIcon } from "@/components/menu-icons";
import { Card, TableContainer } from "@/components/admin";

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
  const { data: typesRows } = await supabase
    .from("article_types")
    .select("id, name, icon_code")
    .eq("store_id", storeId);
  const typeById = new Map((typesRows ?? []).map((t) => [t.id, t]));

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
          <CreateItemForm storeId={storeId} articleTypes={articleTypes ?? []} />
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Lista</h2>
        <Card>
          <TableContainer>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-600">
                  <th className="text-left py-2 px-3 text-slate-300">Nome</th>
                  <th className="text-left py-2 px-3 text-slate-300">Preço</th>
                  <th className="text-left py-2 px-3 text-slate-300">Tipo</th>
                  <th className="text-left py-2 px-3 text-slate-300">Promo</th>
                  <th className="text-left py-2 px-3 text-slate-300">TA</th>
                  <th className="text-left py-2 px-3 text-slate-300">Ordem</th>
                  <th className="text-left py-2 px-3 text-slate-300">Visível</th>
                  <th className="text-left py-2 px-3 text-slate-300">Destaque</th>
                  <th className="text-left py-2 px-3 text-slate-300">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(items ?? []).map((i) => {
                  const at = i.article_type_id ? typeById.get(i.article_type_id) : null;
                  return (
                    <tr key={i.id} className="border-b border-slate-700">
                      <td className="py-2 px-3 text-slate-200">{i.menu_name ?? "—"}</td>
                      <td className="py-2 px-3 text-slate-200">{i.menu_price != null ? `${Number(i.menu_price).toFixed(2)} €` : "—"}</td>
                      <td className="py-2 px-3">{at ? <span title={at.name}><MenuIcon code={at.icon_code} size={18} /></span> : "—"}</td>
                      <td className="py-2 px-3 text-slate-200">{i.is_promotion ? (i.price_old != null ? `${i.price_old}→` : "Sim") : "—"}</td>
                      <td className="py-2 px-3 text-slate-200">{i.take_away ? "Sim" : "—"}</td>
                      <td className="py-2 px-3 text-slate-200">{i.sort_order}</td>
                      <td className="py-2 px-3 text-slate-200">{i.is_visible ? "Sim" : "Não"}</td>
                      <td className="py-2 px-3 text-slate-200">{i.is_featured ? "★" : "—"}</td>
                      <td className="py-2 px-3">
                        <ItemActions itemId={i.id} menuName={i.menu_name ?? ""} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableContainer>
          {(!items || items.length === 0) && <p className="text-slate-500 py-4">Nenhum item.</p>}
        </Card>
      </section>
    </div>
  );
}
