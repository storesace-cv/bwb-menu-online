/**
 * Bootstrap demo menu from JSON file (no currency in data; UI formats with store config).
 * Uses admin RPCs for tenant/store/domain; upserts allergens, categories, items, links.
 * Idempotent. Set DEMO_MENU_JSON to path (e.g. ./local/menu-demo/menu-demo.json or /opt/bwb-menu-online/local/menu-demo/menu-demo.json).
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import { resolve } from "path";

type DemoJson = {
  tenant: { nif: string; name: string };
  store: { store_number: number; name: string; source_type: string };
  domain: { hostname: string };
  allergens: { code: string; name: string }[];
  categories: { name: string; description: string | null; sort_order: number; is_visible: boolean }[];
  items: {
    menu_name: string;
    menu_description?: string | null;
    menu_price?: number | null;
    prep_minutes?: number | null;
    is_visible?: boolean;
    is_featured?: boolean;
    sort_order?: number;
    image_url?: string | null;
    categories: string[];
    allergens: string[];
  }[];
};

async function main() {
  const appDir = process.env.APP_DIR || process.cwd();
  const envPath = resolve(appDir, ".env");
  const { config } = await import("dotenv");
  config({ path: envPath });

  const primaryPath =
    process.env.DEMO_MENU_JSON || resolve(appDir, "local/menu-demo/menu-demo.json");
  const fullPath = primaryPath.startsWith("/") ? primaryPath : resolve(appDir, primaryPath);
  const fallbackPath = resolve(appDir, "scripts/menu-demo.example.json");

  let raw: string;
  let usedPath: string;
  try {
    raw = await readFile(fullPath, "utf-8");
    usedPath = fullPath;
  } catch {
    try {
      raw = await readFile(fallbackPath, "utf-8");
      usedPath = fallbackPath;
      console.log("Using fallback demo JSON: scripts/menu-demo.example.json");
    } catch (e) {
      console.warn("Demo JSON not found (skip). Tried:", fullPath, "and", fallbackPath);
      process.exit(0);
    }
  }
  if (usedPath === fullPath) {
    console.log("Using demo JSON:", fullPath);
  }

  const data = JSON.parse(raw) as DemoJson;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: tenantId, error: e1 } = await supabase.rpc("admin_create_tenant", {
    p_nif: data.tenant.nif.trim().toLowerCase(),
    p_name: data.tenant.name || null,
    p_contact_email: null,
  });
  if (e1) {
    console.error("admin_create_tenant:", e1.message);
    process.exit(1);
  }

  const { data: storeId, error: e2 } = await supabase.rpc("admin_create_store", {
    p_tenant_id: tenantId,
    p_store_number: data.store.store_number,
    p_name: data.store.name || null,
    p_source_type: data.store.source_type || "netbo",
  });
  if (e2) {
    console.error("admin_create_store:", e2.message);
    process.exit(1);
  }

  const { error: e3 } = await supabase.rpc("admin_set_store_domain", {
    p_store_id: storeId,
    p_hostname: data.domain.hostname.trim().toLowerCase(),
    p_domain_type: "default",
    p_is_primary: true,
  });
  if (e3) {
    console.error("admin_set_store_domain:", e3.message);
    process.exit(1);
  }

  const { data: storeRow } = await supabase
    .from("stores")
    .select("menu_cleared_at")
    .eq("id", storeId)
    .single();
  const skipMenuRepopulation = storeRow?.menu_cleared_at != null;

  let allergensCreated = 0;
  const allergenIdByCode: Record<string, string> = {};
  for (const a of data.allergens || []) {
    const code = a.code.trim().toUpperCase();
    const { data: existing } = await supabase.from("allergens").select("id").eq("code", code).maybeSingle();
    if (existing) {
      allergenIdByCode[code] = existing.id;
    } else {
      const name_i18n = { pt: a.name || a.code, en: a.name || a.code };
      const { data: inserted } = await supabase
        .from("allergens")
        .insert({ code, name_i18n, severity: 2, sort_order: 0 })
        .select("id")
        .single();
      if (inserted) {
        allergenIdByCode[code] = inserted.id;
        allergensCreated++;
      }
    }
  }
  console.log("Allergens: created", allergensCreated, "existing/by code:", Object.keys(allergenIdByCode).length);

  if (skipMenuRepopulation) {
    console.log("Store menu was explicitly cleared; skipping menu repopulation.");
    process.exit(0);
  }

  const categoryIdByName: Record<string, string> = {};
  for (const c of data.categories || []) {
    const name = c.name.trim();
    const { data: existing } = await supabase
      .from("menu_categories")
      .select("id")
      .eq("store_id", storeId)
      .eq("name", name)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("menu_categories")
        .update({
          description: c.description ?? null,
          sort_order: c.sort_order ?? 0,
          is_visible: c.is_visible ?? true,
        })
        .eq("id", existing.id);
      categoryIdByName[name] = existing.id;
    } else {
      const { data: inserted } = await supabase
        .from("menu_categories")
        .insert({
          store_id: storeId,
          name,
          description: c.description ?? null,
          sort_order: c.sort_order ?? 0,
          is_visible: c.is_visible ?? true,
        })
        .select("id")
        .single();
      if (inserted) {
        categoryIdByName[name] = inserted.id;
      }
    }
  }
  console.log("Categories: upserted", Object.keys(categoryIdByName).length);

  const itemIdByMenuName: Record<string, string> = {};
  for (const it of data.items || []) {
    const menu_name = it.menu_name.trim();
    const { data: existing } = await supabase
      .from("menu_items")
      .select("id")
      .eq("store_id", storeId)
      .eq("menu_name", menu_name)
      .maybeSingle();
    const row = {
      store_id: storeId,
      menu_name,
      menu_description: it.menu_description ?? null,
      menu_price: it.menu_price != null ? Number(it.menu_price) : null,
      prep_minutes: it.prep_minutes ?? null,
      is_visible: it.is_visible ?? true,
      is_featured: it.is_featured ?? false,
      sort_order: it.sort_order ?? 0,
      image_url: it.image_url ?? null,
    };
    if (existing) {
      await supabase.from("menu_items").update(row).eq("id", existing.id);
      itemIdByMenuName[menu_name] = existing.id;
    } else {
      const { data: inserted } = await supabase.from("menu_items").insert(row).select("id").single();
      if (inserted) {
        itemIdByMenuName[menu_name] = inserted.id;
      }
    }
  }
  console.log("Items: upserted", Object.keys(itemIdByMenuName).length);

  for (const it of data.items || []) {
    const menuName = it.menu_name.trim();
    const itemId = itemIdByMenuName[menuName];
    if (!itemId) continue;
    for (let i = 0; i < (it.categories || []).length; i++) {
      const catName = it.categories[i].trim();
      const categoryId = categoryIdByName[catName];
      if (!categoryId) continue;
      await supabase
        .from("menu_category_items")
        .upsert(
          { category_id: categoryId, menu_item_id: itemId, sort_order: i },
          { onConflict: "category_id,menu_item_id" }
        );
    }
  }
  console.log("menu_category_items: linked");

  for (const it of data.items || []) {
    const menuName = it.menu_name.trim();
    const itemId = itemIdByMenuName[menuName];
    if (!itemId) continue;
    for (const code of it.allergens || []) {
      const allergenId = allergenIdByCode[code.trim().toUpperCase()];
      if (!allergenId) continue;
      await supabase.from("menu_item_allergens").upsert(
        { menu_item_id: itemId, allergen_id: allergenId },
        { onConflict: "menu_item_id,allergen_id" }
      );
    }
  }
  console.log("menu_item_allergens: linked");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
