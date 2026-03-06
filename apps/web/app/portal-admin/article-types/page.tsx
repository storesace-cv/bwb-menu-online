import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { CreateArticleTypeForm } from "./create-article-type-form";
import { ArticleTypeRow } from "./article-type-row";
import { Card } from "@/components/admin";

export default async function ArticleTypesPage() {
  const headersList = await headers();
  const host = headersList.get("x-portal-host") ?? headersList.get("host") ?? "";
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Tipos de artigo</h1>
        <p className="text-slate-400">Aceda através do subdomínio da loja.</p>
      </div>
    );
  }

  const { data: articleTypes } = await supabase
    .from("article_types")
    .select("id, name, icon_code, sort_order")
    .eq("store_id", storeId)
    .order("sort_order");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Tipos de artigo</h1>
      <p className="text-slate-400 mb-2">Tipos que pode associar aos itens do menu (ex.: Carne, Peixe, Marisco, Vegetais). Cada tipo tem um ícone.</p>
      <p className="mb-6">
        <Link href="/portal-admin/menu" className="text-emerald-400 hover:text-emerald-300">← Menu</Link>
        {" · "}
        <Link href="/portal-admin/settings/items" className="text-emerald-400 hover:text-emerald-300">Gestão de Artigos</Link>
      </p>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Novo tipo</h2>
          <CreateArticleTypeForm storeId={storeId} />
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Lista</h2>
        {(!articleTypes || articleTypes.length === 0) && <p className="text-slate-500">Nenhum tipo definido.</p>}
        <Card>
          <ul className="list-none pl-0 divide-y divide-slate-700">
            {(articleTypes ?? []).map((at) => (
              <ArticleTypeRow key={at.id} articleType={at} />
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
