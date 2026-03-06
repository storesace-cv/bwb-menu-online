import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { CreateArticleTypeForm } from "./create-article-type-form";
import { ArticleTypeRow } from "./article-type-row";

export default async function ArticleTypesPage() {
  const headersList = await headers();
  const host = headersList.get("x-portal-host") ?? headersList.get("host") ?? "";
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    return (
      <div>
        <h1>Tipos de artigo</h1>
        <p>Aceda através do subdomínio da loja.</p>
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
      <h1>Tipos de artigo</h1>
      <p>Tipos que pode associar aos itens do menu (ex.: Carne, Peixe, Marisco, Vegetais). Cada tipo tem um ícone.</p>
      <p><Link href="/portal-admin/menu">← Menu</Link> · <Link href="/portal-admin/items">Itens</Link></p>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Novo tipo</h2>
        <CreateArticleTypeForm storeId={storeId} />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Lista</h2>
        {(!articleTypes || articleTypes.length === 0) && <p style={{ color: "#666" }}>Nenhum tipo definido.</p>}
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {(articleTypes ?? []).map((at) => (
            <ArticleTypeRow key={at.id} articleType={at} />
          ))}
        </ul>
      </section>
    </div>
  );
}
