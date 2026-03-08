import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { EditItemForm } from "../../edit-item-form";
import { Card } from "@/components/admin";

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headersList = await headers();
  const host = headersList.get("x-portal-host") ?? headersList.get("host") ?? "";
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Editar item</h1>
        <p className="text-slate-400 mb-4">Domínio não associado a nenhuma loja.</p>
        <p><Link href="/portal-admin/settings/items" className="text-emerald-400 hover:text-emerald-300">← Voltar aos itens</Link></p>
      </div>
    );
  }

  const { data: itemRaw, error } = await supabase
    .from("menu_items")
    .select("id, menu_name, menu_description, menu_price, sort_order, article_type_id, is_promotion, price_old, take_away, menu_ingredients, is_visible, is_featured, image_url, image_path, image_base_path, has_image, catalog_item_id, catalog_items(name_original)")
    .eq("id", id)
    .eq("store_id", storeId)
    .single();

  const item = itemRaw
    ? (() => {
        const { catalog_items: catalog, ...rest } = itemRaw as typeof itemRaw & { catalog_items?: { name_original: string | null } | null };
        return {
          ...rest,
          menu_name: (rest.menu_name ?? catalog?.name_original ?? "") as string,
        };
      })()
    : null;

  if (error || !item) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Editar item</h1>
        <p className="text-slate-400 mb-4">Item não encontrado ou sem acesso.</p>
        <p><Link href="/portal-admin/settings/items" className="text-emerald-400 hover:text-emerald-300">← Voltar aos itens</Link></p>
      </div>
    );
  }

  const { data: articleTypes } = await supabase
    .from("article_types")
    .select("id, name, icon_code")
    .eq("store_id", storeId)
    .order("sort_order");

  const { data: sections } = await supabase
    .from("menu_sections")
    .select("id, name")
    .eq("store_id", storeId)
    .order("sort_order");
  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id, name, section_id, sort_order")
    .eq("store_id", storeId)
    .order("sort_order");

  const { data: mciRows } = await supabase
    .from("menu_category_items")
    .select("category_id")
    .eq("menu_item_id", id);
  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
  const sortedMci = (mciRows ?? []).slice().sort((a, b) => {
    const orderA = categoryById.get(a.category_id)?.sort_order ?? 999;
    const orderB = categoryById.get(b.category_id)?.sort_order ?? 999;
    return orderA - orderB;
  });
  const firstCategoryId = sortedMci[0]?.category_id ?? null;
  const firstCategory = firstCategoryId ? categoryById.get(firstCategoryId) : null;
  const currentSectionId = firstCategory?.section_id ?? null;
  const currentCategoryId = firstCategoryId;

  const { data: settingsRow } = await supabase
    .from("store_settings")
    .select("settings")
    .eq("store_id", storeId)
    .maybeSingle();
  const settings = (settingsRow?.settings as Record<string, unknown>) ?? {};
  const aiEnabled = !!settings.ai_enabled;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Editar item</h1>
      <p className="mb-6"><Link href="/portal-admin/settings/items" className="text-emerald-400 hover:text-emerald-300">← Voltar aos itens</Link></p>
      <Card>
        <EditItemForm
          item={item}
          articleTypes={articleTypes ?? []}
          sections={sections ?? []}
          categories={categories ?? []}
          currentSectionId={currentSectionId}
          currentCategoryId={currentCategoryId}
          storeId={storeId}
          aiEnabled={aiEnabled}
        />
      </Card>
    </div>
  );
}
