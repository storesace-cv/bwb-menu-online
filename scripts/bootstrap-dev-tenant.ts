/**
 * Bootstrap dev tenant: 999999999, store 1, domain 9999999991.menu.bwb.pt.
 * Uses same admin RPCs as Global Admin (no hardcode in app).
 * Idempotent. Run with DEPLOY_ENV=dev (or similar).
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { resolve } from "path";

const NIF = "999999999";
const STORE_NUMBER = 1;
const HOSTNAME = "9999999991.menu.bwb.pt";

async function main() {
  const appDir = process.env.APP_DIR || process.cwd();
  const envPath = resolve(appDir, ".env");
  const { config } = await import("dotenv");
  config({ path: envPath });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: tenantId, error: e1 } = await supabase.rpc("admin_create_tenant", {
    p_nif: NIF,
    p_name: "DEV Tenant",
  });
  if (e1) {
    console.error("admin_create_tenant:", e1.message);
    process.exit(1);
  }
  console.log("Tenant:", tenantId);

  const { data: storeId, error: e2 } = await supabase.rpc("admin_create_store", {
    p_tenant_id: tenantId,
    p_store_number: STORE_NUMBER,
    p_name: "DEV STORE 1",
    p_source_type: "demo",
  });
  if (e2) {
    console.error("admin_create_store:", e2.message);
    process.exit(1);
  }
  console.log("Store:", storeId);

  const { data: domainId, error: e3 } = await supabase.rpc("admin_set_store_domain", {
    p_store_id: storeId,
    p_hostname: HOSTNAME,
    p_domain_type: "default",
    p_is_primary: true,
  });
  if (e3) {
    console.error("admin_set_store_domain:", e3.message);
    process.exit(1);
  }
  console.log("Domain:", domainId);

  const { data: cats } = await supabase
    .from("menu_categories")
    .select("id")
    .eq("store_id", storeId)
    .limit(2);
  if (!cats?.length) {
    const { data: c1 } = await supabase
      .from("menu_categories")
      .insert({ store_id: storeId, name: "Entradas", sort_order: 1 })
      .select("id")
      .single();
    const { data: c2 } = await supabase
      .from("menu_categories")
      .insert({ store_id: storeId, name: "Pratos principais", sort_order: 2 })
      .select("id")
      .single();
    if (c1?.id) {
      const { data: i1 } = await supabase
        .from("menu_items")
        .insert({ store_id: storeId, menu_name: "Sopa do dia", menu_price: 2.5, sort_order: 1 })
        .select("id")
        .single();
      if (i1?.id)
        await supabase.from("menu_category_items").insert({ category_id: c1.id, menu_item_id: i1.id, sort_order: 1 });
    }
    if (c2?.id) {
      const { data: i2 } = await supabase
        .from("menu_items")
        .insert({ store_id: storeId, menu_name: "Bifana", menu_price: 4, is_featured: true, sort_order: 2 })
        .select("id")
        .single();
      const { data: i3 } = await supabase
        .from("menu_items")
        .insert({ store_id: storeId, menu_name: "Prego no prato", menu_price: 8.5, sort_order: 3 })
        .select("id")
        .single();
      if (i2?.id)
        await supabase.from("menu_category_items").insert({ category_id: c2.id, menu_item_id: i2.id, sort_order: 1 });
      if (i3?.id)
        await supabase.from("menu_category_items").insert({ category_id: c2.id, menu_item_id: i3.id, sort_order: 2 });
    }
    console.log("Demo categories and items created.");
  } else {
    console.log("Demo data already present.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
