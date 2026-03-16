import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const EXPECTED_HEADERS = [
  "Tenant",
  "Loja",
  "Código",
  "Nome",
  "Descrição",
  "Ingredientes",
  "Preço",
  "Tipo",
  "Familia",
  "Sub Familia",
  "Secção",
  "Categoria",
  "Promo",
  "TA",
  "Tempo prep.",
  "Ordem",
  "Visível",
  "Destaque",
  "Prato do Dia",
  "Vinho",
];

function trim(s: unknown): string {
  if (s == null) return "";
  return String(s).trim();
}

function parseBool(val: string): boolean {
  const v = val.toLowerCase();
  return v === "sim" || v === "1" || v === "★" || v === "true" || v === "s";
}

/** Convert Excel paragraph placeholder " || " back to newline for DB */
function pipePlaceholderToNewlines(s: string): string {
  return s.split(/\s*\|\|\s*/).join("\n").trim();
}

export async function POST(request: NextRequest) {
  const host = getPortalHost(request.headers);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });
  if (!storeId) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const { data: hasAccess } = await supabase.rpc("user_has_store_access", { p_store_id: storeId });
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: storeRow } = await supabase
    .from("stores")
    .select("id, name, tenant_id, store_number")
    .eq("id", storeId)
    .single();
  if (!storeRow) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("nif, name")
    .eq("id", (storeRow as { tenant_id: string }).tenant_id)
    .single();
  const storeNumber = (storeRow as { store_number?: number }).store_number ?? 0;
  const subdomain = (host.split(".")[0] ?? "").trim();
  const storeNumStr = String(storeNumber);
  const nifFromHost =
    /^\d+$/.test(subdomain) && subdomain.endsWith(storeNumStr)
      ? subdomain.slice(0, -storeNumStr.length)
      : null;
  const sessionTenantLabel =
    (tenantRow as { nif?: string; name?: string } | null)?.nif?.trim() ??
    (tenantRow as { name?: string } | null)?.name?.trim() ??
    nifFromHost ??
    "";
  const sessionStoreLabel = String(
    (storeRow as { store_number?: number }).store_number ??
      (storeRow as { name?: string }).name?.trim() ??
      host ??
      ""
  );

  let file: File;
  try {
    const formData = await request.formData();
    file = formData.get("file") as File;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Ficheiro Excel (.xlsx, .xlsm ou .xls) é obrigatório" }, { status: 400 });
    }
    const name = file.name.toLowerCase();
    const isXls = name.endsWith(".xls") && !name.endsWith(".xlsx") && !name.endsWith(".xlsm");
    if (!name.endsWith(".xlsx") && !name.endsWith(".xlsm") && !isXls) {
      return NextResponse.json({ error: "O ficheiro deve ser .xlsx, .xlsm ou .xls" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Dados do formulário inválidos" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let data: unknown[][];
  try {
    const workbook = XLSX.read(buffer, { type: "buffer", cellText: true });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) {
      return NextResponse.json({ error: "Ficheiro Excel sem folhas" }, { status: 400 });
    }
    const sheet = workbook.Sheets[firstSheet];
    data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Erro ao ler Excel: ${msg}` }, { status: 400 });
  }

  if (!data.length || data.length < 2) {
    return NextResponse.json({ error: "Ficheiro sem dados (apenas cabeçalho ou vazio)" }, { status: 400 });
  }

  const headers = (data[0] as unknown[]).map((c) => trim(c));
  const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Cabeçalhos em falta: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const col = (name: string) => headers.indexOf(name);

  const firstRow = data[1] as unknown[];
  const fileTenant = trim(firstRow[col("Tenant")]);
  const fileStore = trim(firstRow[col("Loja")]);

  if (fileTenant !== sessionTenantLabel || fileStore !== sessionStoreLabel) {
    return NextResponse.json(
      {
        error: `Este ficheiro pertence ao tenant "${fileTenant}" e à loja "${fileStore}". Está a importar na sessão do tenant "${sessionTenantLabel}" e loja "${sessionStoreLabel}". A importação foi rejeitada por segurança.`,
      },
      { status: 403 }
    );
  }

  const { data: articleTypes } = await supabase
    .from("article_types")
    .select("id, name")
    .eq("store_id", storeId);
  const typeNameToId = new Map<string, string>();
  for (const t of articleTypes ?? []) {
    const name = (t as { name: string }).name?.trim();
    if (name) typeNameToId.set(name, (t as { id: string }).id);
  }

  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id, name, section_id")
    .eq("store_id", storeId);
  const { data: sections } = await supabase
    .from("menu_sections")
    .select("id, name")
    .eq("store_id", storeId);
  const sectionNameToId = new Map<string, string>();
  for (const s of sections ?? []) {
    const name = (s as { name: string }).name?.trim();
    if (name) sectionNameToId.set(name, (s as { id: string }).id);
  }
  const categoryByNameAndSection = new Map<string, string>();
  for (const c of categories ?? []) {
    const cat = c as { id: string; name: string; section_id: string | null };
    const key = cat.section_id ? `${cat.name.trim()}|${cat.section_id}` : cat.name.trim();
    categoryByNameAndSection.set(key, cat.id);
  }

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    const codigo = trim(row[col("Código")]);
    if (!codigo) {
      skipped++;
      continue;
    }

    const { data: menuItem } = await supabase
      .from("menu_items")
      .select("id")
      .eq("store_id", storeId)
      .eq("item_code", codigo)
      .maybeSingle();

    if (!menuItem) {
      skipped++;
      continue;
    }

    const menuName = trim(row[col("Nome")]);
    const descRaw = trim(row[col("Descrição")]);
    const ingrRaw = trim(row[col("Ingredientes")]);
    const typeName = trim(row[col("Tipo")]);
    const sectionName = trim(row[col("Secção")]);
    const categoryName = trim(row[col("Categoria")]);
    const promoStr = trim(row[col("Promo")]);
    const taStr = trim(row[col("TA")]);
    const prepRaw = row[col("Tempo prep.")];
    const orderRaw = row[col("Ordem")];
    const visibleStr = trim(row[col("Visível")]);
    const featuredStr = trim(row[col("Destaque")]);
    const dishOfTheDayStr = trim(row[col("Prato do Dia")]);
    const wineStr = trim(row[col("Vinho")]);

    const prep_minutes = prepRaw !== "" && prepRaw != null && !Number.isNaN(Number(prepRaw)) ? Number(prepRaw) : null;
    const sort_order = orderRaw !== "" && orderRaw != null && !Number.isNaN(Number(orderRaw)) ? Number(orderRaw) : null;
    const article_type_id = typeName && typeNameToId.has(typeName) ? typeNameToId.get(typeName)! : null;
    const is_promotion = parseBool(promoStr);
    const take_away = parseBool(taStr);
    const is_visible = parseBool(visibleStr);
    const is_featured = parseBool(featuredStr);
    const is_dish_of_the_day = parseBool(dishOfTheDayStr);
    const is_wine = parseBool(wineStr);

    const menu_description = descRaw ? pipePlaceholderToNewlines(descRaw) || null : null;
    const menu_ingredients = ingrRaw ? pipePlaceholderToNewlines(ingrRaw) || null : null;

    const updatePayload: Record<string, unknown> = {
      menu_name: menuName || null,
      menu_description,
      menu_ingredients,
      article_type_id,
      prep_minutes,
      sort_order,
      is_promotion,
      take_away,
      is_visible,
      is_featured,
      is_dish_of_the_day,
      is_wine,
    };

    const { error: updateErr } = await supabase
      .from("menu_items")
      .update(updatePayload)
      .eq("id", (menuItem as { id: string }).id);
    if (updateErr) {
      errors.push(`Código ${codigo}: ${updateErr.message}`);
      continue;
    }

    let categoryId: string | null = null;
    if (sectionName && categoryName) {
      const sectionId = sectionNameToId.get(sectionName);
      if (sectionId) {
        categoryId = categoryByNameAndSection.get(`${categoryName}|${sectionId}`) ?? categoryByNameAndSection.get(categoryName) ?? null;
      }
      if (!categoryId) {
        categoryId = categoryByNameAndSection.get(categoryName) ?? null;
      }
    }
    if (categoryId) {
      await supabase.from("menu_category_items").delete().eq("menu_item_id", (menuItem as { id: string }).id);
      await supabase.from("menu_category_items").insert({
        menu_item_id: (menuItem as { id: string }).id,
        category_id: categoryId,
        sort_order: 0,
      });
    }

    updated++;
  }

  return NextResponse.json({
    ok: true,
    updated,
    skipped,
    total_rows: data.length - 1,
    errors: errors.length > 0 ? errors : undefined,
  });
}
