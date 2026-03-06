import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { CreateCategoryForm } from "../../menu/create-category-form";
import { CategoryRow } from "./category-row";
import { Card } from "@/components/admin";

export default async function CategoriesPage() {
  const headersList = await headers();
  const host = headersList.get("x-portal-host") ?? headersList.get("host") ?? "";
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Categorias</h1>
        <p className="text-slate-400">Domínio não associado a nenhuma loja.</p>
        <p className="mt-4"><Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</Link></p>
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

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Categorias</h1>
      <p className="text-slate-400 mb-6">Categorias do menu (ex.: Entradas, Sobremesas). Podem estar associadas a uma secção.</p>
      <p className="mb-6">
        <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</Link>
      </p>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Nova categoria</h2>
          <CreateCategoryForm storeId={storeId} sections={sections ?? []} />
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Lista de categorias</h2>
        <Card>
          {categories && categories.length > 0 ? (
            <ul className="list-none pl-0">
              {categories.map((c) => (
                <CategoryRow key={c.id} category={c} sections={sections ?? []} />
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 py-4">Nenhuma categoria. Crie uma acima.</p>
          )}
        </Card>
      </section>
    </div>
  );
}
