"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

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

export async function createCategory(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const storeId = (formData.get("store_id") as string)?.trim() ?? "";
  const name = (formData.get("name") as string)?.trim() ?? "";
  const sortOrder = parseInt((formData.get("sort_order") as string) ?? "0", 10);
  if (!storeId || !name) return { error: "Loja e nome obrigatórios" };
  const { error } = await supabase.from("menu_categories").insert({
    store_id: storeId,
    name,
    sort_order: sortOrder,
  });
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/menu");
  revalidatePath("/portal-admin/items");
  return null;
}

export async function createMenuItem(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const storeId = (formData.get("store_id") as string)?.trim() ?? "";
  const menuName = (formData.get("menu_name") as string)?.trim() ?? "";
  const menuPrice = parseFloat((formData.get("menu_price") as string) ?? "0");
  const sortOrder = parseInt((formData.get("sort_order") as string) ?? "0", 10);
  if (!storeId || !menuName) return { error: "Loja e nome do item obrigatórios" };
  const { error } = await supabase.from("menu_items").insert({
    store_id: storeId,
    menu_name: menuName,
    menu_price: isNaN(menuPrice) ? null : menuPrice,
    sort_order: sortOrder,
  });
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/menu");
  revalidatePath("/portal-admin/items");
  return null;
}
