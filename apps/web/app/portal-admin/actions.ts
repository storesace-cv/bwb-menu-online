"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

const ARTICLE_TYPE_ICON_WHITELIST: readonly string[] = ["fish", "meat", "seafood", "veggie", "hot-spice"];
function normalizeArticleTypeIconCode(code: string): string {
  return ARTICLE_TYPE_ICON_WHITELIST.includes(code) ? code : "fish";
}

export async function createTenant(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const nif = (formData.get("nif") as string)?.trim() ?? "";
  const name = (formData.get("name") as string)?.trim() ?? "";
  if (!nif) return { error: "NIF obrigatório" };
  const { data, error } = await supabase.rpc("admin_create_tenant", {
    p_nif: nif,
    p_name: name || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/tenants");
  return null;
}

export async function createStore(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const tenantId = (formData.get("tenant_id") as string)?.trim() ?? "";
  const storeNumber = parseInt((formData.get("store_number") as string) ?? "0", 10);
  const name = (formData.get("name") as string)?.trim() ?? "";
  const sourceType = (formData.get("source_type") as string)?.trim() ?? "netbo";
  if (!tenantId || !storeNumber) return { error: "Tenant e número da loja obrigatórios" };
  const { error } = await supabase.rpc("admin_create_store", {
    p_tenant_id: tenantId,
    p_store_number: storeNumber,
    p_name: name || null,
    p_source_type: sourceType,
  });
  if (error) return { error: error.message };
  revalidatePath(`/portal-admin/tenants/${tenantId}/stores`);
  return null;
}

export async function setStoreDomain(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const storeId = (formData.get("store_id") as string)?.trim() ?? "";
  const hostname = (formData.get("hostname") as string)?.trim() ?? "";
  const domainType = (formData.get("domain_type") as string)?.trim() ?? "default";
  const isPrimary = formData.get("is_primary") === "1";
  if (!storeId || !hostname) return { error: "Store e hostname obrigatórios" };
  const { error } = await supabase.rpc("admin_set_store_domain", {
    p_store_id: storeId,
    p_hostname: hostname,
    p_domain_type: domainType,
    p_is_primary: isPrimary,
  });
  if (error) return { error: error.message };
  revalidatePath(`/portal-admin/tenants`);
  revalidatePath(`/portal-admin/tenants/*/stores/*/domains`);
  return null;
}

export async function createSection(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const storeId = (formData.get("store_id") as string)?.trim() ?? "";
  const name = (formData.get("name") as string)?.trim() ?? "";
  const sortOrder = parseInt((formData.get("sort_order") as string) ?? "0", 10);
  if (!storeId || !name) return { error: "Loja e nome obrigatórios" };
  const { error } = await supabase.from("menu_sections").insert({
    store_id: storeId,
    name,
    sort_order: sortOrder,
  });
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/menu");
  revalidatePath("/portal-admin/sections");
  return null;
}

export async function createCategory(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const storeId = (formData.get("store_id") as string)?.trim() ?? "";
  const name = (formData.get("name") as string)?.trim() ?? "";
  const sortOrder = parseInt((formData.get("sort_order") as string) ?? "0", 10);
  const sectionId = (formData.get("section_id") as string)?.trim() || null;
  if (!storeId || !name) return { error: "Loja e nome obrigatórios" };
  const { error } = await supabase.from("menu_categories").insert({
    store_id: storeId,
    name,
    sort_order: sortOrder,
    section_id: sectionId || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/menu");
  revalidatePath("/portal-admin/items");
  return null;
}

export async function assignRole(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const userId = (formData.get("user_id") as string)?.trim() ?? "";
  const roleCode = (formData.get("role_code") as string)?.trim() ?? "";
  const tenantId = (formData.get("tenant_id") as string)?.trim() || null;
  const storeId = (formData.get("store_id") as string)?.trim() || null;
  if (!userId || !roleCode) return { error: "Utilizador e role obrigatórios" };
  const { error } = await supabase.rpc("admin_assign_role", {
    p_user_id: userId,
    p_role_code: roleCode,
    p_tenant_id: tenantId,
    p_store_id: storeId,
  });
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/users");
  return null;
}

export async function createArticleType(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const storeId = (formData.get("store_id") as string)?.trim() ?? "";
  const name = (formData.get("name") as string)?.trim() ?? "";
  const iconCode = normalizeArticleTypeIconCode((formData.get("icon_code") as string)?.trim() ?? "fish");
  const sortOrder = parseInt((formData.get("sort_order") as string) ?? "0", 10);
  if (!storeId || !name) return { error: "Loja e nome obrigatórios" };
  const { error } = await supabase.from("article_types").insert({
    store_id: storeId,
    name,
    icon_code: iconCode,
    sort_order: sortOrder,
  });
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/article-types");
  revalidatePath("/portal-admin/items");
  return null;
}

export async function updateArticleType(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const id = (formData.get("id") as string)?.trim() ?? "";
  const name = (formData.get("name") as string)?.trim() ?? "";
  const iconCode = normalizeArticleTypeIconCode((formData.get("icon_code") as string)?.trim() ?? "fish");
  const sortOrder = parseInt((formData.get("sort_order") as string) ?? "0", 10);
  if (!id || !name) return { error: "ID e nome obrigatórios" };
  const { error } = await supabase
    .from("article_types")
    .update({ name, icon_code: iconCode, sort_order: sortOrder })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/article-types");
  revalidatePath("/portal-admin/items");
  return null;
}

export async function deleteArticleType(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const id = (formData.get("id") as string)?.trim() ?? "";
  if (!id) return { error: "ID obrigatório" };
  const { error } = await supabase.from("article_types").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/article-types");
  revalidatePath("/portal-admin/items");
  return null;
}

export async function createMenuItem(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const storeId = (formData.get("store_id") as string)?.trim() ?? "";
  const menuName = (formData.get("menu_name") as string)?.trim() ?? "";
  const menuDescription = (formData.get("menu_description") as string)?.trim() || null;
  const menuPrice = parseFloat((formData.get("menu_price") as string) ?? "0");
  const sortOrder = parseInt((formData.get("sort_order") as string) ?? "0", 10);
  const articleTypeId = (formData.get("article_type_id") as string)?.trim() || null;
  const isPromotion = formData.get("is_promotion") === "1";
  const priceOld = parseFloat((formData.get("price_old") as string) ?? "0");
  const takeAway = formData.get("take_away") === "1";
  const menuIngredients = (formData.get("menu_ingredients") as string)?.trim() || null;
  if (!storeId || !menuName) return { error: "Loja e nome do item obrigatórios" };
  const { error } = await supabase.from("menu_items").insert({
    store_id: storeId,
    menu_name: menuName,
    menu_description: menuDescription,
    menu_price: isNaN(menuPrice) ? null : menuPrice,
    sort_order: sortOrder,
    article_type_id: articleTypeId,
    is_promotion: isPromotion,
    price_old: isPromotion && !isNaN(priceOld) ? priceOld : null,
    take_away: takeAway,
    menu_ingredients: menuIngredients,
  });
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/menu");
  revalidatePath("/portal-admin/items");
  return null;
}

export async function updateMenuItem(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const id = (formData.get("id") as string)?.trim() ?? "";
  const menuName = (formData.get("menu_name") as string)?.trim() ?? "";
  const menuDescription = (formData.get("menu_description") as string)?.trim() || null;
  const menuPrice = parseFloat((formData.get("menu_price") as string) ?? "0");
  const sortOrder = parseInt((formData.get("sort_order") as string) ?? "0", 10);
  const articleTypeId = (formData.get("article_type_id") as string)?.trim() || null;
  const isPromotion = formData.get("is_promotion") === "1";
  const priceOld = parseFloat((formData.get("price_old") as string) ?? "0");
  const takeAway = formData.get("take_away") === "1";
  const menuIngredients = (formData.get("menu_ingredients") as string)?.trim() || null;
  const isVisible = formData.get("is_visible") === "1";
  const isFeatured = formData.get("is_featured") === "1";
  if (!id || !menuName) return { error: "ID e nome do item obrigatórios" };
  const { error } = await supabase
    .from("menu_items")
    .update({
      menu_name: menuName,
      menu_description: menuDescription,
      menu_price: isNaN(menuPrice) ? null : menuPrice,
      sort_order: sortOrder,
      article_type_id: articleTypeId,
      is_promotion: isPromotion,
      price_old: isPromotion && !isNaN(priceOld) ? priceOld : null,
      take_away: takeAway,
      menu_ingredients: menuIngredients,
      is_visible: isVisible,
      is_featured: isFeatured,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/menu");
  revalidatePath("/portal-admin/items");
  return null;
}

export async function deleteMenuItem(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const id = (formData.get("id") as string)?.trim() ?? "";
  if (!id) return { error: "ID obrigatório" };
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/menu");
  revalidatePath("/portal-admin/items");
  return null;
}

export async function updateStoreSettings(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const storeId = (formData.get("store_id") as string)?.trim() ?? "";
  if (!storeId) return { error: "Loja obrigatória" };
  const { data: hasAccess } = await supabase.rpc("user_has_store_access", { p_store_id: storeId });
  if (!hasAccess) return { error: "Sem acesso a esta loja" };

  const { data: existing } = await supabase
    .from("store_settings")
    .select("settings")
    .eq("store_id", storeId)
    .maybeSingle();
  const currentSettings: Record<string, string> = (existing?.settings as Record<string, string> | null) ?? {};

  const storeDisplayName = (formData.get("store_display_name") as string)?.trim() ?? "";
  const primaryColor = (formData.get("primary_color") as string)?.trim() ?? "";
  const logoUrl = (formData.get("logo_url") as string)?.trim() ?? "";
  const currencyCode = (formData.get("currency_code") as string)?.trim() ?? "";
  const menuTemplateKey = (formData.get("menu_template_key") as string)?.trim() || "bwb-branco";
  const heroText = (formData.get("hero_text") as string)?.trim() ?? "";
  const footerText = (formData.get("footer_text") as string)?.trim() ?? "";
  const contactUrl = (formData.get("contact_url") as string)?.trim() ?? "";
  const privacyUrl = (formData.get("privacy_url") as string)?.trim() ?? "";
  const reservationUrl = (formData.get("reservation_url") as string)?.trim() ?? "";

  const merged: Record<string, string> = { ...currentSettings };
  merged.store_display_name = storeDisplayName;
  merged.primary_color = primaryColor;
  merged.logo_url = logoUrl;
  merged.currency_code = currencyCode;
  merged.menu_template_key = menuTemplateKey;
  merged.hero_text = heroText;
  merged.footer_text = footerText;
  merged.contact_url = contactUrl;
  merged.privacy_url = privacyUrl;
  merged.reservation_url = reservationUrl;

  const { error } = await supabase.from("store_settings").upsert(
    { store_id: storeId, settings: merged, updated_at: new Date().toISOString() },
    { onConflict: "store_id" }
  );
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/settings");
  return null;
}
