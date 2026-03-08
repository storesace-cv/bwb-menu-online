"use server";

import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { sendFirstStoreWelcomeEmail } from "@/lib/mailer";
import { tenantsActionLog } from "@/lib/portal-debug-log";

const DEFAULT_PASSWORD = "bwb-menu";

const ARTICLE_TYPE_ICON_WHITELIST: readonly string[] = ["fish", "meat", "seafood", "veggie", "hot-spice"];
function normalizeArticleTypeIconCode(code: string): string {
  return ARTICLE_TYPE_ICON_WHITELIST.includes(code) ? code : "fish";
}

export async function createTenant(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const nif = (formData.get("nif") as string)?.trim() ?? "";
  const name = (formData.get("name") as string)?.trim() ?? "";
  const contactEmail = (formData.get("contact_email") as string)?.trim()?.toLowerCase() ?? "";
  if (!nif) return { error: "NIF obrigatório" };
  if (!contactEmail) return { error: "Email obrigatório" };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(contactEmail)) return { error: "Email inválido" };
  const { data, error } = await supabase.rpc("admin_create_tenant", {
    p_nif: nif,
    p_name: name || null,
    p_contact_email: contactEmail,
  });
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/tenants");
  revalidatePath("/portal-admin/settings");
  return null;
}

export async function createStore(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const tenantId = (formData.get("tenant_id") as string)?.trim() ?? "";
  const storeNumber = parseInt((formData.get("store_number") as string) ?? "0", 10);
  const name = (formData.get("name") as string)?.trim() ?? "";
  const sourceType = (formData.get("source_type") as string)?.trim() ?? "netbo_api";
  const domainOrigin = (formData.get("domain_origin") as string)?.trim() ?? "shared";
  const domainHostname = (formData.get("domain_hostname") as string)?.trim() ?? "";
  if (!tenantId || !storeNumber) return { error: "Tenant e número da loja obrigatórios" };
  const { data: storeId, error } = await supabase.rpc("admin_create_store", {
    p_tenant_id: tenantId,
    p_store_number: storeNumber,
    p_name: name || null,
    p_source_type: sourceType,
  });
  if (error) return { error: error.message };
  if (!storeId) return null;
  if (domainOrigin === "private") {
    await supabase.from("stores").update({ domain_origin: "private", custom_domain: domainHostname || null }).eq("id", storeId);
  }
  let hostnameToSet: string | null = null;
  if (domainOrigin === "shared") {
    const { data: tenantRow } = await supabase.from("tenants").select("nif").eq("id", tenantId).single();
    const nif = (tenantRow?.nif ?? "").trim().toLowerCase();
    if (nif) hostnameToSet = `${nif}${storeNumber}.menu.bwb.pt`;
  } else if (domainHostname) {
    hostnameToSet = domainHostname.toLowerCase();
  }
  if (hostnameToSet) {
    const { error: domainErr } = await supabase.rpc("admin_set_store_domain", {
      p_store_id: storeId,
      p_hostname: hostnameToSet,
      p_domain_type: "default",
      p_is_primary: true,
    });
    if (domainErr) return { error: `Loja criada, mas falha ao associar domínio: ${domainErr.message}` };
  }

  // Primeira loja: criar utilizador tenant_admin e enviar e-mail com credenciais (service role para contornar RLS em tenants)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    const admin = createServiceClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: tenantRow } = await admin.from("tenants").select("contact_email").eq("id", tenantId).single();
    const contactEmail = (tenantRow?.contact_email ?? "").trim().toLowerCase();
    const { count } = await admin.from("stores").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
    if (count === 1 && contactEmail) {
      try {
        const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
        const existing = listData?.users?.find((u) => u.email?.toLowerCase() === contactEmail);
        let userId: string;
        if (existing) {
          userId = existing.id;
          await admin.auth.admin.updateUserById(userId, {
            password: DEFAULT_PASSWORD,
            user_metadata: { must_change_password: true },
          });
          await admin.from("profiles").upsert(
            { id: userId, email: contactEmail, renew_password: true },
            { onConflict: "id" }
          );
          await admin.from("user_role_bindings").delete().eq("user_id", userId).eq("role_code", "tenant_admin").eq("tenant_id", tenantId);
        } else {
          const { data: created, error: createErr } = await admin.auth.admin.createUser({
            email: contactEmail,
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: { must_change_password: true },
          });
          if (createErr) throw createErr;
          if (!created?.user) throw new Error("User not created");
          userId = created.user.id;
          await admin.from("profiles").upsert(
            { id: userId, email: contactEmail, renew_password: true },
            { onConflict: "id" }
          );
        }
        await admin.from("user_role_bindings").insert({
          user_id: userId,
          role_code: "tenant_admin",
          tenant_id: tenantId,
          store_id: null,
        });
        const portalUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://menu.bwb.pt";
        const storeUrl = hostnameToSet
          ? `https://${hostnameToSet}/portal-admin/login`
          : `${portalUrl}/portal-admin/login`;
        await sendFirstStoreWelcomeEmail({
          to: contactEmail,
          portalUrl: storeUrl,
          passwordDefault: DEFAULT_PASSWORD,
        });
      } catch (err) {
        console.error("First store welcome (create user/email):", (err as Error).message);
      }
    }
  }

  revalidatePath(`/portal-admin/tenants/${tenantId}/stores`);
  revalidatePath("/portal-admin/tenants");
  return null;
}

export async function updateTenantContactEmail(tenantId: string, contactEmail: string) {
  tenantsActionLog({
    action: "updateTenantContactEmail",
    tenantId: tenantId?.slice(0, 8),
    emailLen: contactEmail?.length ?? 0,
  });
  try {
    const supabase = await createClient();
    tenantsActionLog({ action: "updateTenantContactEmail", step: "createClient_ok" });
    const tid = (tenantId ?? "").trim();
    const email = (contactEmail ?? "").trim().toLowerCase();
    if (!tid) return { error: "Tenant obrigatório" };
    if (!email) return { error: "Email obrigatório" };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return { error: "Email inválido" };
    const { error } = await supabase.rpc("admin_update_tenant", {
      p_tenant_id: tid,
      p_name: null,
      p_contact_email: email,
    });
    tenantsActionLog({
      action: "updateTenantContactEmail",
      step: "rpc_done",
      rpcError: error?.message ?? null,
    });
    if (error) return { error: error.message };
    revalidatePath("/portal-admin/tenants");
    revalidatePath("/portal-admin/settings");
    tenantsActionLog({ action: "updateTenantContactEmail", step: "revalidatePath_ok" });
    tenantsActionLog({ action: "updateTenantContactEmail", step: "success" });
    return null;
  } catch (err) {
    console.error(err);
    tenantsActionLog({
      action: "updateTenantContactEmail",
      step: "catch",
      error: err instanceof Error ? err.message : String(err),
    });
    return { error: err instanceof Error ? err.message : "Erro ao guardar email." };
  }
}

export async function resendTenantWelcomeEmail(tenantId: string): Promise<{ error?: string } | null> {
  tenantsActionLog({
    action: "resendTenantWelcomeEmail",
    tenantId: tenantId?.slice(0, 8),
  });
  const tid = (tenantId ?? "").trim();
  if (!tid) return { error: "Tenant obrigatório" };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { error: "Configuração do servidor em falta." };

  try {
    const admin = createServiceClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: tenantRow } = await admin.from("tenants").select("contact_email").eq("id", tid).single();
    const contactEmail = (tenantRow?.contact_email ?? "").trim().toLowerCase();
    tenantsActionLog({
      action: "resendTenantWelcomeEmail",
      step: "tenant_read",
      hasContactEmail: !!contactEmail,
    });
    if (!contactEmail) {
      tenantsActionLog({
        action: "resendTenantWelcomeEmail",
        step: "early_return",
        reason: "no_contact_email",
      });
      return { error: "Defina o email do tenant antes de re-enviar." };
    }

    const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existing = listData?.users?.find((u) => u.email?.toLowerCase() === contactEmail);
    let userId: string;
    if (existing) {
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, {
        password: DEFAULT_PASSWORD,
        user_metadata: { must_change_password: true },
      });
      await admin.from("profiles").upsert(
        { id: userId, email: contactEmail, renew_password: true },
        { onConflict: "id" }
      );
      await admin.from("user_role_bindings").delete().eq("user_id", userId).eq("role_code", "tenant_admin").eq("tenant_id", tid);
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: contactEmail,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { must_change_password: true },
      });
      if (createErr) return { error: createErr.message };
      if (!created?.user) return { error: "Utilizador não foi criado." };
      userId = created.user.id;
      await admin.from("profiles").upsert(
        { id: userId, email: contactEmail, renew_password: true },
        { onConflict: "id" }
      );
    }
    tenantsActionLog({ action: "resendTenantWelcomeEmail", step: "auth_done" });
    await admin.from("user_role_bindings").insert({
      user_id: userId,
      role_code: "tenant_admin",
      tenant_id: tid,
      store_id: null,
    });
    const portalUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://menu.bwb.pt";
    let storeUrl = `${portalUrl}/portal-admin/login`;
    const { data: firstStore } = await admin
      .from("stores")
      .select("id")
      .eq("tenant_id", tid)
      .order("store_number", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstStore?.id) {
      const { data: primaryDomain } = await admin
        .from("store_domains")
        .select("hostname")
        .eq("store_id", firstStore.id)
        .eq("is_primary", true)
        .limit(1)
        .maybeSingle();
      if (primaryDomain?.hostname) {
        storeUrl = `https://${primaryDomain.hostname}/portal-admin/login`;
      }
    }
    await sendFirstStoreWelcomeEmail({
      to: contactEmail,
      portalUrl: storeUrl,
      passwordDefault: DEFAULT_PASSWORD,
    });
    tenantsActionLog({ action: "resendTenantWelcomeEmail", step: "email_sent" });
    tenantsActionLog({ action: "resendTenantWelcomeEmail", step: "success" });
    revalidatePath("/portal-admin/tenants");
    return null;
  } catch (err) {
    tenantsActionLog({
      action: "resendTenantWelcomeEmail",
      step: "catch",
      error: err instanceof Error ? err.message : String(err),
    });
    return { error: err instanceof Error ? err.message : "Erro ao re-enviar e-mail." };
  }
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

export async function updateStoreSourceType(storeId: string, sourceType: string) {
  const supabase = await createClient();
  const st = (sourceType ?? "").trim();
  if (!storeId || !st) return { error: "Store e origem obrigatórios" };
  const { error } = await supabase.rpc("admin_update_store", {
    p_store_id: storeId,
    p_source_type: st,
    p_name: null,
  });
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/tenants");
  revalidatePath("/portal-admin/tenants/*/stores");
  return null;
}

export async function clearStoreMenu(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const storeId = (formData.get("store_id") as string)?.trim() ?? "";
  if (!storeId) return { error: "Store obrigatório" };
  const { error } = await supabase.rpc("admin_clear_store_menu", { p_store_id: storeId });
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/tenants");
  revalidatePath("/portal-admin/tenants/*/stores");
  revalidatePath("/portal-admin/menu");
  revalidatePath("/portal-admin/settings/items");
  revalidatePath("/portal-admin/settings/sections");
  revalidatePath("/portal-admin/settings/categories");
  return null;
}

export async function updateImportFieldMapping(
  id: string,
  targetField: string,
  transform: { type: string },
  isActive: boolean
): Promise<{ error?: string } | null> {
  const supabase = await createClient();
  if (!id?.trim()) return { error: "ID obrigatório" };
  const { error } = await supabase.rpc("admin_update_import_field_mapping", {
    p_id: id,
    p_target_field: (targetField ?? "").trim(),
    p_transform: transform ?? { type: "copy" },
    p_is_active: isActive,
  });
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/import/mappings");
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
  revalidatePath("/portal-admin/settings/sections");
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
  revalidatePath("/portal-admin/settings/items");
  revalidatePath("/portal-admin/settings/categories");
  return null;
}

export async function updateSection(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const id = (formData.get("id") as string)?.trim() ?? "";
  const name = (formData.get("name") as string)?.trim() ?? "";
  const sortOrder = parseInt((formData.get("sort_order") as string) ?? "0", 10);
  if (!id || !name) return { error: "ID e nome obrigatórios" };
  const { data: row } = await supabase.from("menu_sections").select("store_id").eq("id", id).single();
  if (!row) return { error: "Secção não encontrada" };
  const { data: hasAccess } = await supabase.rpc("user_has_store_access", { p_store_id: row.store_id });
  if (!hasAccess) return { error: "Sem acesso a esta loja" };
  const { error } = await supabase
    .from("menu_sections")
    .update({ name, sort_order: sortOrder })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/menu");
  revalidatePath("/portal-admin/settings/sections");
  return null;
}

export async function deleteSection(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const id = (formData.get("id") as string)?.trim() ?? "";
  if (!id) return { error: "ID obrigatório" };
  const { data: row } = await supabase.from("menu_sections").select("store_id").eq("id", id).single();
  if (!row) return { error: "Secção não encontrada" };
  const { data: hasAccess } = await supabase.rpc("user_has_store_access", { p_store_id: row.store_id });
  if (!hasAccess) return { error: "Sem acesso a esta loja" };
  const { data: cats } = await supabase.from("menu_categories").select("id").eq("section_id", id).limit(1);
  if (cats && cats.length > 0) return { error: "Não pode apagar secção com categorias associadas. Desassocie primeiro." };
  const { error } = await supabase.from("menu_sections").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/menu");
  revalidatePath("/portal-admin/settings/sections");
  return null;
}

export async function updateCategory(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const id = (formData.get("id") as string)?.trim() ?? "";
  const name = (formData.get("name") as string)?.trim() ?? "";
  const sortOrder = parseInt((formData.get("sort_order") as string) ?? "0", 10);
  const sectionId = (formData.get("section_id") as string)?.trim() || null;
  if (!id || !name) return { error: "ID e nome obrigatórios" };
  const { data: row } = await supabase.from("menu_categories").select("store_id").eq("id", id).single();
  if (!row) return { error: "Categoria não encontrada" };
  const { data: hasAccess } = await supabase.rpc("user_has_store_access", { p_store_id: row.store_id });
  if (!hasAccess) return { error: "Sem acesso a esta loja" };
  const { error } = await supabase
    .from("menu_categories")
    .update({ name, sort_order: sortOrder, section_id: sectionId || null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/menu");
  revalidatePath("/portal-admin/settings/categories");
  return null;
}

export async function deleteCategory(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const id = (formData.get("id") as string)?.trim() ?? "";
  if (!id) return { error: "ID obrigatório" };
  const { data: row } = await supabase.from("menu_categories").select("store_id").eq("id", id).single();
  if (!row) return { error: "Categoria não encontrada" };
  const { data: hasAccess } = await supabase.rpc("user_has_store_access", { p_store_id: row.store_id });
  if (!hasAccess) return { error: "Sem acesso a esta loja" };
  await supabase.from("menu_category_items").delete().eq("category_id", id);
  const { error } = await supabase.from("menu_categories").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/menu");
  revalidatePath("/portal-admin/settings/categories");
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
  revalidatePath("/portal-admin/settings/items");
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
  revalidatePath("/portal-admin/settings/items");
  return null;
}

export async function deleteArticleType(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const id = (formData.get("id") as string)?.trim() ?? "";
  if (!id) return { error: "ID obrigatório" };
  const { error } = await supabase.from("article_types").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/article-types");
  revalidatePath("/portal-admin/settings/items");
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
  revalidatePath("/portal-admin/settings/items");
  return null;
}

function isValidUrl(s: string): boolean {
  if (!s || !s.trim()) return true;
  try {
    new URL(s.trim());
    return true;
  } catch {
    return false;
  }
}

export async function updateMenuItem(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const supabase = await createClient();
  const id = (formData.get("id") as string)?.trim() ?? "";
  const menuName = (formData.get("menu_name") as string)?.trim() ?? "";
  const menuDescription = (formData.get("menu_description") as string)?.trim() || null;
  const menuPrice = parseFloat((formData.get("menu_price") as string) ?? "0");
  const sortOrder = parseInt((formData.get("sort_order") as string) ?? "0", 10);
  const articleTypeId = (formData.get("article_type_id") as string)?.trim() || null;
  const isPromotion = formData.get("is_promotion") === "1";
  const priceOldRaw = (formData.get("price_old") as string)?.trim() ?? "";
  const priceOld = parseFloat(priceOldRaw);
  const takeAway = formData.get("take_away") === "1";
  const menuIngredients = (formData.get("menu_ingredients") as string)?.trim() || null;
  const isVisible = formData.get("is_visible") === "1";
  const isFeatured = formData.get("is_featured") === "1";
  const imageUrl = (formData.get("image_url") as string)?.trim() || null;
  const sectionId = (formData.get("section_id") as string)?.trim() || null;
  const categoryId = (formData.get("category_id") as string)?.trim() || null;

  if (!id || !menuName) return { error: "ID e nome do item obrigatórios" };
  if (imageUrl !== null && !isValidUrl(imageUrl)) return { error: "URL da imagem inválida." };
  if (isPromotion && (priceOldRaw === "" || isNaN(priceOld) || priceOld <= 0))
    return { error: "Preço antigo é obrigatório quando o item está em promoção." };

  const { data: itemRow, error: itemErr } = await supabase
    .from("menu_items")
    .select("store_id")
    .eq("id", id)
    .single();
  if (itemErr || !itemRow) return { error: "Item não encontrado." };

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
      image_url: imageUrl,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  if (sectionId || categoryId) {
    let targetCategoryId: string | null = categoryId;
    if (!targetCategoryId && sectionId) {
      const { data: firstCat } = await supabase
        .from("menu_categories")
        .select("id")
        .eq("section_id", sectionId)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      targetCategoryId = firstCat?.id ?? null;
      if (!targetCategoryId) {
        const { data: sectionRow } = await supabase
          .from("menu_sections")
          .select("store_id")
          .eq("id", sectionId)
          .single();
        if (!sectionRow) return { error: "Secção inválida." };
        const { data: hasAccess } = await supabase.rpc("user_has_store_access", { p_store_id: sectionRow.store_id });
        if (!hasAccess) return { error: "Sem acesso a esta loja." };
        const { data: newCat, error: insertErr } = await supabase
          .from("menu_categories")
          .insert({
            store_id: sectionRow.store_id,
            section_id: sectionId,
            name: "Geral",
            sort_order: 0,
          })
          .select("id")
          .single();
        if (insertErr || !newCat) return { error: "Não foi possível criar a categoria na secção." };
        targetCategoryId = newCat.id;
      }
    }
    if (targetCategoryId) {
      const { data: catRow } = await supabase
        .from("menu_categories")
        .select("store_id")
        .eq("id", targetCategoryId)
        .single();
      if (!catRow) return { error: "Categoria inválida." };
      if (catRow.store_id !== itemRow.store_id) return { error: "Categoria de outra loja." };
      const { data: hasAccess } = await supabase.rpc("user_has_store_access", { p_store_id: catRow.store_id });
      if (!hasAccess) return { error: "Sem acesso a esta loja." };
      await supabase.from("menu_category_items").delete().eq("menu_item_id", id);
      await supabase.from("menu_category_items").insert({ category_id: targetCategoryId, menu_item_id: id });
    }
  }

  revalidatePath("/portal-admin/menu");
  revalidatePath("/portal-admin/settings/items");
  return { success: true };
}

export async function deleteMenuItem(_prev: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();
  const id = (formData.get("id") as string)?.trim() ?? "";
  if (!id) return { error: "ID obrigatório" };
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/portal-admin/menu");
  revalidatePath("/portal-admin/settings/items");
  return null;
}

export async function batchUpdateItemsSectionCategory(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const supabase = await createClient();
  const itemIdsRaw = formData.get("item_ids") as string;
  const itemIds = (itemIdsRaw ? JSON.parse(itemIdsRaw) : []) as string[];
  const sectionId = (formData.get("section_id") as string)?.trim() || null;
  const categoryId = (formData.get("category_id") as string)?.trim() || null;
  const batchArticleTypeId = (formData.get("batch_article_type_id") as string)?.trim() || null;
  const batchIsVisible = (formData.get("batch_is_visible") as string) ?? "";
  const batchIsFeatured = (formData.get("batch_is_featured") as string) ?? "";
  const batchTakeAway = (formData.get("batch_take_away") as string) ?? "";
  const batchIsPromotion = (formData.get("batch_is_promotion") as string) ?? "";

  if (!itemIds?.length) return { error: "Selecione pelo menos um artigo." };
  const hasSectionOrCategory = !!(sectionId || categoryId);
  const hasBatchFields =
    !!batchArticleTypeId ||
    batchIsVisible !== "" ||
    batchIsFeatured !== "" ||
    batchTakeAway !== "" ||
    batchIsPromotion !== "";
  if (!hasSectionOrCategory && !hasBatchFields)
    return { error: "Selecione pelo menos uma alteração a aplicar." };

  let targetCategoryId: string | null = null;
  let catRow: { store_id: string } | null = null;

  if (hasSectionOrCategory) {
    targetCategoryId = categoryId;
    if (!targetCategoryId && sectionId) {
      const { data: firstCat } = await supabase
        .from("menu_categories")
        .select("id")
        .eq("section_id", sectionId)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      targetCategoryId = firstCat?.id ?? null;
      if (!targetCategoryId) {
        const { data: sectionRow } = await supabase
          .from("menu_sections")
          .select("store_id")
          .eq("id", sectionId)
          .single();
        if (!sectionRow) return { error: "Secção inválida." };
        const { data: hasAccess } = await supabase.rpc("user_has_store_access", { p_store_id: sectionRow.store_id });
        if (!hasAccess) return { error: "Sem acesso a esta loja." };
        const { data: newCat, error: insertErr } = await supabase
          .from("menu_categories")
          .insert({
            store_id: sectionRow.store_id,
            section_id: sectionId,
            name: "Geral",
            sort_order: 0,
          })
          .select("id")
          .single();
        if (insertErr || !newCat) return { error: "Não foi possível criar a categoria na secção." };
        targetCategoryId = newCat.id;
      }
    }
    if (targetCategoryId) {
      const { data: cRow } = await supabase
        .from("menu_categories")
        .select("store_id")
        .eq("id", targetCategoryId)
        .single();
      if (!cRow) return { error: "Categoria inválida." };
      catRow = cRow;
      const { data: hasAccess } = await supabase.rpc("user_has_store_access", { p_store_id: catRow.store_id });
      if (!hasAccess) return { error: "Sem acesso a esta loja." };
    }
  }

  const menuItemsUpdate: Record<string, unknown> = {};
  if (batchArticleTypeId !== null) menuItemsUpdate.article_type_id = batchArticleTypeId || null;
  if (batchIsVisible !== "") menuItemsUpdate.is_visible = batchIsVisible === "1";
  if (batchIsFeatured !== "") menuItemsUpdate.is_featured = batchIsFeatured === "1";
  if (batchTakeAway !== "") menuItemsUpdate.take_away = batchTakeAway === "1";
  if (batchIsPromotion !== "") menuItemsUpdate.is_promotion = batchIsPromotion === "1";

  for (const menuItemId of itemIds) {
    const { data: itemRow } = await supabase.from("menu_items").select("store_id").eq("id", menuItemId).single();
    if (!itemRow) continue;
    if (targetCategoryId && catRow && itemRow.store_id === catRow.store_id) {
      await supabase.from("menu_category_items").delete().eq("menu_item_id", menuItemId);
      await supabase.from("menu_category_items").insert({ category_id: targetCategoryId, menu_item_id: menuItemId });
    }
    if (Object.keys(menuItemsUpdate).length > 0) {
      await supabase.from("menu_items").update(menuItemsUpdate).eq("id", menuItemId);
    }
  }
  revalidatePath("/portal-admin/menu");
  revalidatePath("/portal-admin/settings/items");
  return { success: true };
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
  revalidatePath("/portal-admin/settings/app");
  return null;
}
