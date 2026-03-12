import { headers } from "next/headers";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import { buildMenuUpdatesWorkbook, type MenuExcelRow } from "@/lib/menu-excel-export";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 10000;

const MENU_EXPORT_HEADERS = [
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
];

function getTemplatePath(): string | null {
  const candidates = [
    path.join(process.cwd(), "public", "templates", "menu-export-template.xlsm"),
    path.join(process.cwd(), "apps", "web", "public", "templates", "menu-export-template.xlsm"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function fillMenuSheetFromRows(
  sheet: XLSX.WorkSheet,
  tenantLabel: string,
  storeLabel: string,
  rows: MenuExcelRow[]
): void {
  for (let c = 0; c < MENU_EXPORT_HEADERS.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (!sheet[ref]) sheet[ref] = { t: "s", v: "" };
    sheet[ref].v = MENU_EXPORT_HEADERS[c];
    sheet[ref].t = "s";
  }
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const values: (string | number | null)[] = [
      tenantLabel,
      storeLabel,
      row.item_code ?? "",
      row.menu_name ?? "",
      row.description ?? "",
      row.ingredients ?? "",
      row.price != null ? row.price : "",
      row.type_name,
      row.familia,
      row.sub_familia,
      row.section_name,
      row.category_name,
      row.promo,
      row.ta,
      row.prep_minutes != null ? row.prep_minutes : "",
      row.sort_order != null ? row.sort_order : "",
      row.is_visible,
      row.is_featured,
    ];
    for (let c = 0; c < values.length; c++) {
      const ref = XLSX.utils.encode_cell({ r: r + 1, c });
      const v = values[c];
      if (!sheet[ref]) sheet[ref] = { t: "s", v: "" };
      sheet[ref].v = v === null || v === "" ? "" : v;
      sheet[ref].t = typeof v === "number" ? "n" : "s";
    }
  }
}

export async function GET() {
  const headersList = await headers();
  const host = getPortalHost(headersList);
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
  const tenantNifRaw = (tenantRow as { nif?: string } | null)?.nif?.trim();
  const tenantNif = tenantNifRaw ?? nifFromHost ?? "Tenant";
  const tenantLabel =
    tenantNifRaw ??
    (tenantRow as { name?: string } | null)?.name?.trim() ??
    nifFromHost ??
    "Tenant";
  const storeLabel = String(
    (storeRow as { store_number?: number }).store_number ??
      (storeRow as { name?: string }).name?.trim() ??
      host ??
      storeId
  );

  const now = new Date();
  const ddmmaa_hhmm = [
    String(now.getDate()).padStart(2, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getFullYear()).slice(-2),
  ]
    .join("")
    .concat("_", String(now.getHours()).padStart(2, "0"), String(now.getMinutes()).padStart(2, "0"));
  const filenameXlsx = `${tenantNif}-${storeNumber}_${ddmmaa_hhmm}.xlsx`;
  const filenameXlsm = `${tenantNif}-${storeNumber}_${ddmmaa_hhmm}.xlsm`;

  const { data: articleTypes } = await supabase
    .from("article_types")
    .select("id, name")
    .eq("store_id", storeId)
    .order("sort_order");
  const typeNames = (articleTypes ?? []).map((t) => (t as { name: string }).name);

  const { data: sections } = await supabase
    .from("menu_sections")
    .select("id, name")
    .eq("store_id", storeId)
    .order("sort_order");
  const sectionNames = (sections ?? []).map((s) => (s as { name: string }).name);

  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id, name, section_id, sort_order")
    .eq("store_id", storeId)
    .order("sort_order");
  const categoryNames = (categories ?? []).map((c) => (c as { name: string }).name);

  const sectionByIdForExport = new Map((sections ?? []).map((s) => [(s as { id: string }).id, (s as { name: string }).name]));
  const categoriesBySectionName: Record<string, string[]> = {};
  for (const cat of categories ?? []) {
    const c = cat as { id: string; name: string; section_id: string | null };
    const secName = c.section_id ? sectionByIdForExport.get(c.section_id) : null;
    if (secName) {
      if (!categoriesBySectionName[secName]) categoriesBySectionName[secName] = [];
      categoriesBySectionName[secName].push(c.name);
    }
  }
  for (const name of sectionNames) {
    if (!categoriesBySectionName[name]) categoriesBySectionName[name] = ["—"];
  }

  const { data: itemsRaw } = await supabase
    .from("menu_items")
    .select("id, item_code, menu_name, menu_description, menu_ingredients, menu_price, is_visible, is_featured, sort_order, is_promotion, price_old, take_away, article_type_id, prep_minutes, catalog_item_id, catalog_items(name_original)")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("menu_name", { ascending: true })
    .limit(MAX_ITEMS);

  if (!itemsRaw || itemsRaw.length === 0) {
    const buffer = await buildMenuUpdatesWorkbook({
      tenantLabel,
      storeLabel,
      rows: [],
      typeNames,
      sectionNames,
      categoryNames,
      categoriesBySectionName,
    });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenameXlsx}"`,
      },
    });
  }

  const itemIds = itemsRaw.map((i) => i.id);
  const { data: resolvedPricesRows } = await supabase.rpc("get_resolved_prices_for_store", { p_store_id: storeId });
  const resolvedPriceByItemId = new Map<string, number>();
  for (const row of resolvedPricesRows ?? []) {
    if (row.menu_item_id && itemIds.includes(row.menu_item_id) && row.resolved_price != null) {
      resolvedPriceByItemId.set(row.menu_item_id, Number(row.resolved_price));
    }
  }

  const { data: familiaRows } = await supabase.rpc("get_import_familia_for_store", { p_store_id: storeId });
  const itemFamilia: Record<string, { familia: string | null; sub_familia: string | null }> = {};
  for (const i of itemsRaw) {
    itemFamilia[i.id] = { familia: null, sub_familia: null };
  }
  for (const row of familiaRows ?? []) {
    if (row.menu_item_id && itemFamilia[row.menu_item_id] !== undefined) {
      itemFamilia[row.menu_item_id] = {
        familia: row.familia ?? null,
        sub_familia: row.sub_familia ?? null,
      };
    }
  }

  const typeById = new Map((articleTypes ?? []).map((t) => [(t as { id: string }).id, (t as { name: string }).name]));

  const { data: sectionCategoryRows } = await supabase.rpc("get_menu_items_section_category_for_export", {
    p_store_id: storeId,
  });
  const itemSectionCategory: Record<string, { sectionName: string; categoryName: string }> = {};
  for (const row of sectionCategoryRows ?? []) {
    const id = (row as { menu_item_id?: string }).menu_item_id;
    if (id) {
      itemSectionCategory[id] = {
        sectionName: (row as { section_name?: string | null }).section_name ?? "—",
        categoryName: (row as { category_name?: string | null }).category_name ?? "—",
      };
    }
  }
  for (const item of itemsRaw) {
    if (!(item.id in itemSectionCategory)) {
      itemSectionCategory[item.id] = { sectionName: "—", categoryName: "—" };
    }
  }

  /** Replace line breaks with " || " for Excel (avoids cell newline issues); trim, null if empty */
  const newlinesToPipePlaceholder = (s: string | null | undefined): string | null => {
    if (s == null) return null;
    const out = (s as string).replace(/\r\n|\r|\n/g, " || ").trim();
    return out || null;
  };

  const rows: MenuExcelRow[] = itemsRaw.map((i) => {
    const rawCatalog = (i as { catalog_items?: { name_original: string | null } | { name_original: string | null }[] | null }).catalog_items;
    const catalog = Array.isArray(rawCatalog) ? rawCatalog[0] ?? null : rawCatalog;
    const displayName = (i as { menu_name?: string | null }).menu_name?.trim() || catalog?.name_original?.trim() || "";
    const price = resolvedPriceByItemId.get(i.id) ?? (i as { menu_price?: number | null }).menu_price ?? null;
    const typeName = (i as { article_type_id?: string | null }).article_type_id ? typeById.get((i as { article_type_id: string }).article_type_id) ?? "" : "";
    const fam = itemFamilia[i.id];
    const secCat = itemSectionCategory[i.id];
    return {
      item_code: (i as { item_code?: string | null }).item_code ?? null,
      menu_name: displayName || null,
      description: newlinesToPipePlaceholder((i as { menu_description?: string | null }).menu_description),
      ingredients: newlinesToPipePlaceholder((i as { menu_ingredients?: string | null }).menu_ingredients),
      price,
      type_name: typeName,
      familia: fam?.familia ?? "—",
      sub_familia: fam?.sub_familia ?? "—",
      section_name: secCat?.sectionName ?? "—",
      category_name: secCat?.categoryName ?? "—",
      promo: (i as { is_promotion?: boolean }).is_promotion ? "Sim" : "Não",
      ta: (i as { take_away?: boolean }).take_away ? "Sim" : "Não",
      prep_minutes: (i as { prep_minutes?: number | null }).prep_minutes ?? null,
      sort_order: (i as { sort_order?: number | null }).sort_order ?? null,
      is_visible: (i as { is_visible?: boolean }).is_visible ? "Sim" : "Não",
      is_featured: (i as { is_featured?: boolean }).is_featured ? "Sim" : "Não",
    };
  });

  /** Ordenar por Familia; Sub Familia; Nome (valores "—" e vazios tratados como "" para comparação) */
  const norm = (s: string | null): string => (s == null || s === "—" ? "" : String(s).trim());
  rows.sort((a, b) => {
    const fa = norm(a.familia);
    const fb = norm(b.familia);
    const cmpF = fa.localeCompare(fb, "pt");
    if (cmpF !== 0) return cmpF;
    const sa = norm(a.sub_familia);
    const sb = norm(b.sub_familia);
    const cmpS = sa.localeCompare(sb, "pt");
    if (cmpS !== 0) return cmpS;
    const na = norm(a.menu_name);
    const nb = norm(b.menu_name);
    return na.localeCompare(nb, "pt");
  });

  const templatePath = getTemplatePath();
  if (!templatePath && process.env.NODE_ENV === "development") {
    console.warn(
      "[menu-updates export] Template menu-export-template.xlsm não encontrado; export será .xlsx sem macros. Coloque o ficheiro em public/templates/."
    );
  }
  if (templatePath) {
    try {
      const templateBuffer = fs.readFileSync(templatePath);
      const wb = XLSX.read(templateBuffer, { type: "buffer", bookVBA: true });
      const sheetName = wb.SheetNames.find((n) => n === "Menu") ?? wb.SheetNames[0];
      if (sheetName && wb.Sheets[sheetName]) {
        const sheet = wb.Sheets[sheetName];
        fillMenuSheetFromRows(sheet, tenantLabel, storeLabel, rows);
        const lastRow = rows.length;
        const lastCol = MENU_EXPORT_HEADERS.length - 1;
        sheet["!ref"] = XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: lastRow, c: lastCol },
        });
        const outBuffer = XLSX.write(wb, {
          type: "buffer",
          bookType: "xlsm",
          bookVBA: true,
        }) as Buffer;
        return new NextResponse(new Uint8Array(outBuffer), {
          headers: {
            "Content-Type": "application/vnd.ms-excel.sheet.macroEnabled.12",
            "Content-Disposition": `attachment; filename="${filenameXlsm}"`,
          },
        });
      }
    } catch (_e) {
      // fallback to xlsx
    }
  }

  const buffer = await buildMenuUpdatesWorkbook({
    tenantLabel,
    storeLabel,
    rows,
    typeNames,
    sectionNames,
    categoryNames,
    categoriesBySectionName,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameXlsx}"`,
    },
  });
}
