import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import Link from "next/link";
import { EditItemForm } from "../../edit-item-form";
import { Card } from "@/components/admin";

export default async function EditItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const highlightCategoryId = typeof resolvedSearchParams?.highlightCategory === "string"
    ? resolvedSearchParams.highlightCategory
    : null;
  const headersList = await headers();
  const host = getPortalHost(headersList);
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
    .select("id, menu_name, menu_description, menu_price, sort_order, article_type_id, is_promotion, price_old, take_away, menu_ingredients, prep_minutes, is_visible, is_featured, is_dish_of_the_day, is_wine, image_url, image_path, image_base_path, has_image, catalog_item_id, item_code, catalog_items(name_original)")
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

  const { data: resolvedPricesRows } = await supabase.rpc("get_resolved_prices_for_store", { p_store_id: storeId });
  const resolvedPriceRow = (resolvedPricesRows ?? []).find((r: { menu_item_id: string }) => r.menu_item_id === id);
  const resolvedPrice = resolvedPriceRow != null && (resolvedPriceRow as { resolved_price: number | null }).resolved_price != null
    ? Number((resolvedPriceRow as { resolved_price: number }).resolved_price)
    : null;

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

  const { data: familiaRows } = await supabase.rpc("get_import_familia_for_store", { p_store_id: storeId });
  let familia: string | null = null;
  let subFamilia: string | null = null;
  const itemFamiliaRow = (familiaRows ?? []).find((r: { menu_item_id: string }) => r.menu_item_id === id);
  if (itemFamiliaRow) {
    familia = (itemFamiliaRow as { familia: string | null }).familia ?? null;
    subFamilia = (itemFamiliaRow as { sub_familia: string | null }).sub_familia ?? null;
  }

  const { data: aiEnabledRpc } = await supabase.rpc("store_can_use_ai_description", {
    p_store_id: storeId,
  });
  const aiEnabled = !!aiEnabledRpc;

  let imageSource = "storage";
  const { data: tenantImageSource } = await supabase.rpc("get_tenant_image_source_by_store_id", {
    p_store_id: storeId,
  });
  if (typeof tenantImageSource === "string" && ["storage", "url", "legacy_path"].includes(tenantImageSource)) {
    imageSource = tenantImageSource;
  } else {
    const { data: settingsRow } = await supabase
      .from("store_settings")
      .select("settings")
      .eq("store_id", storeId)
      .maybeSingle();
    const settings = (settingsRow?.settings as Record<string, unknown> | null) ?? {};
    const src = settings.image_source;
    if (src === "url" || src === "legacy_path") imageSource = src as string;
  }

  const { data: allergens } = await supabase
    .from("allergens")
    .select("id, code, name_i18n, severity, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  const { data: miaRows } = await supabase
    .from("menu_item_allergens")
    .select("allergen_id")
    .eq("menu_item_id", id);
  const selectedAllergenIds = (miaRows ?? []).map((r) => r.allergen_id);

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
          allergens={allergens ?? []}
          selectedAllergenIds={selectedAllergenIds}
          familia={familia}
          subFamilia={subFamilia}
          highlightCategoryId={highlightCategoryId}
          resolvedPrice={resolvedPrice}
          imageSource={imageSource}
        />
      </Card>
    </div>
  );
}
