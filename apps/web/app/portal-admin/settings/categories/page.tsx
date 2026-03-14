import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import Link from "next/link";
import { CreateCategoryForm } from "../../menu/create-category-form";
import { CategoriesListClient } from "./categories-list-client";
import { CategoryTitleAppearanceForm } from "./category-title-appearance-form";
import { Card } from "@/components/admin";

export default async function CategoriesPage() {
  const headersList = await headers();
  const host = getPortalHost(headersList);
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
    .select("id, name, sort_order, section_id, presentation_template_id, sample_image_id")
    .eq("store_id", storeId)
    .order("sort_order");

  const { data: imageSamples } = await supabase
    .from("image_samples")
    .select("id, name")
    .is("store_id", null)
    .order("name");

  type CategoryItem = { id: string; name: string; sort_order: number; section_id: string | null; presentation_template_id?: string | null; sample_image_id?: string | null };
  const categoriesBySectionId = new Map<string, CategoryItem[]>();
  for (const c of categories ?? []) {
    if (c.section_id) {
      const list = categoriesBySectionId.get(c.section_id) ?? [];
      list.push(c);
      categoriesBySectionId.set(c.section_id, list);
    }
  }
  for (const list of Array.from(categoriesBySectionId.values())) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }
  const uncategorized = (categories ?? []).filter((c) => !c.section_id);

  const { data: presentationTemplates } = await supabase
    .from("menu_presentation_templates")
    .select("id, name")
    .order("name");

  const { data: settingsRow } = await supabase
    .from("store_settings")
    .select("settings")
    .eq("store_id", storeId)
    .maybeSingle();
  const settings = (settingsRow?.settings as Record<string, string> | null) ?? {};

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Categorias</h1>
      <p className="text-slate-400 mb-6">Categorias do menu (ex.: Entradas, Sobremesas). Cada categoria pertence a uma e só uma secção; pode haver categorias com o mesmo nome em secções diferentes (são registos distintos).</p>
      <p className="mb-6">
        <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</Link>
      </p>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Aparência dos títulos de categoria no menu</h2>
          <p className="text-slate-400 text-sm mb-4">
            Estas opções aplicam-se a todos os títulos de categoria do menu (ex.: Entradas, Sobremesas).
          </p>
          <CategoryTitleAppearanceForm
            storeId={storeId}
            initial={{
              category_title_align: settings.category_title_align,
              category_title_margin_bottom: settings.category_title_margin_bottom,
              category_title_padding_top: settings.category_title_padding_top,
              category_title_indent_px: settings.category_title_indent_px,
              category_title_color: settings.category_title_color,
            }}
          />
        </Card>
      </section>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Nova categoria</h2>
          <CreateCategoryForm storeId={storeId} sections={sections ?? []} presentationTemplates={presentationTemplates ?? []} />
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Lista de categorias</h2>
        <Card>
          {categories && categories.length > 0 ? (
            <CategoriesListClient
              storeId={storeId}
              sections={sections ?? []}
              categoriesBySectionId={Object.fromEntries(categoriesBySectionId)}
              uncategorized={uncategorized}
              presentationTemplates={presentationTemplates ?? []}
              imageSamples={imageSamples ?? []}
            />
          ) : (
            <p className="text-slate-500 py-4">Nenhuma categoria. Crie uma acima.</p>
          )}
        </Card>
      </section>
    </div>
  );
}
