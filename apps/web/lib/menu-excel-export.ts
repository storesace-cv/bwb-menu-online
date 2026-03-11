/**
 * Geração do ficheiro Excel para Actualizações ao Menu.
 * Colunas: Tenant, Loja, Código, Nome, Descrição, Ingredientes, Preço, Tipo, Familia, Sub Familia, Secção, Categoria, Promo, TA, Tempo prep., Ordem, Visível, Destaque.
 * Células bloqueadas: Tenant, Loja, Código, Preço, Familia, Sub Familia.
 * Validação: listas para Tipo, Secção, Categoria, Promo, TA, Visível, Destaque; numérico para Tempo prep. e Ordem.
 */

import ExcelJS from "exceljs";

const HEADERS = [
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
] as const;

/** Colunas bloqueadas (0-based): 0 Tenant, 1 Loja, 2 Código, 6 Preço, 8 Familia, 9 Sub Familia */
const LOCKED_COLUMNS = new Set([0, 1, 2, 6, 8, 9]);

export type MenuExcelRow = {
  item_code: string | null;
  menu_name: string | null;
  description: string | null;
  ingredients: string | null;
  price: number | null;
  type_name: string;
  familia: string;
  sub_familia: string;
  section_name: string;
  category_name: string;
  promo: "Sim" | "Não";
  ta: "Sim" | "Não";
  prep_minutes: number | null;
  sort_order: number | null;
  is_visible: "Sim" | "Não";
  is_featured: "Sim" | "Não";
};

export type MenuExcelExportParams = {
  tenantLabel: string;
  storeLabel: string;
  rows: MenuExcelRow[];
  typeNames: string[];
  sectionNames: string[];
  categoryNames: string[];
  /** Section display name -> category names for dependent dropdown (Categoria by Secção) */
  categoriesBySectionName: Record<string, string[]>;
};

/** Excel list validation has a 255 character limit; truncate or use first N values if needed */
function listFormula(values: string[]): string {
  const escaped = values.map((v) => (v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v));
  const s = escaped.join(",");
  if (s.length <= 255) return `"${s}"`;
  return `"${escaped.slice(0, 20).join(",")}"`;
}

/** Sanitize section name for Excel defined name (used in INDIRECT); match SUBSTITUTE in formula */
function sanitizeSectionNameForName(name: string): string {
  return name.replace(/\s+/g, "_").replace(/—/g, "_");
}

function getExcelColumnLetter(columnNumber: number): string {
  let n = columnNumber;
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

const LISTAS_SHEET_NAME = "_Listas";

export async function buildMenuUpdatesWorkbook(params: MenuExcelExportParams): Promise<Buffer> {
  const { tenantLabel, storeLabel, rows, typeNames, sectionNames, categoryNames, categoriesBySectionName } = params;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Menu", { views: [{ state: "frozen", ySplit: 1 }] });

  // Hidden sheet for category lists per section (for INDIRECT-dependent dropdown)
  const listasSheet = workbook.addWorksheet(LISTAS_SHEET_NAME, { state: "hidden" as const });
  for (let s = 0; s < sectionNames.length; s++) {
    const sectionName = sectionNames[s];
    const cats = categoriesBySectionName[sectionName] ?? ["—"];
    const col = s + 1;
    for (let row = 1; row <= cats.length; row++) {
      listasSheet.getCell(row, col).value = cats[row - 1];
    }
    const ref = `'${LISTAS_SHEET_NAME}'!$${getExcelColumnLetter(col)}$$1:$${getExcelColumnLetter(col)}$${Math.max(1, cats.length)}`;
    const definedName = sanitizeSectionNameForName(sectionName);
    workbook.definedNames.add(ref, definedName);
  }

  // Header row
  const headerRow = sheet.getRow(1);
  HEADERS.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  headerRow.font = { bold: true };

  // Data rows (Descrição and Ingredientes use " || " as paragraph placeholder, no newlines in cells)
  rows.forEach((row, idx) => {
    const r = sheet.getRow(idx + 2);
    r.getCell(1).value = tenantLabel;
    r.getCell(2).value = storeLabel;
    r.getCell(3).value = row.item_code ?? "";
    r.getCell(4).value = row.menu_name ?? "";
    r.getCell(5).value = row.description ?? "";
    r.getCell(6).value = row.ingredients ?? "";
    r.getCell(7).value = row.price != null ? Number(row.price) : "";
    r.getCell(8).value = row.type_name;
    r.getCell(9).value = row.familia;
    r.getCell(10).value = row.sub_familia;
    r.getCell(11).value = row.section_name;
    r.getCell(12).value = row.category_name;
    r.getCell(13).value = row.promo;
    r.getCell(14).value = row.ta;
    r.getCell(15).value = row.prep_minutes != null ? row.prep_minutes : "";
    r.getCell(16).value = row.sort_order != null ? row.sort_order : "";
    r.getCell(17).value = row.is_visible;
    r.getCell(18).value = row.is_featured;
  });

  const lastDataRow = Math.max(2, rows.length + 1);

  // Protection: lock only specific columns (ExcelJS defaults to locked: true, so we unlock editable columns)
  for (let r = 1; r <= lastDataRow; r++) {
    for (let c = 1; c <= HEADERS.length; c++) {
      const cell = sheet.getCell(r, c);
      cell.protection = { locked: LOCKED_COLUMNS.has(c - 1) };
    }
  }

  // Data validation (only for data rows, row 2 to lastDataRow)
  const typeList = listFormula(typeNames.length ? typeNames : ["—"]);
  const sectionList = listFormula(sectionNames.length ? sectionNames : ["—"]);
  const simNao = '"Sim,Não"';
  const SECTION_COL = 11; // K = Secção
  const CATEGORY_COL = 12; // L = Categoria (dependent on Section via INDIRECT)

  for (let r = 2; r <= lastDataRow; r++) {
    sheet.getCell(r, 8).dataValidation = { type: "list", allowBlank: true, formulae: [typeList] };
    sheet.getCell(r, 11).dataValidation = { type: "list", allowBlank: true, formulae: [sectionList] };
    sheet.getCell(r, CATEGORY_COL).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`INDIRECT(SUBSTITUTE($${getExcelColumnLetter(SECTION_COL)}${r}," ","_"))`],
    };
    sheet.getCell(r, 13).dataValidation = { type: "list", allowBlank: true, formulae: [simNao] };
    sheet.getCell(r, 14).dataValidation = { type: "list", allowBlank: true, formulae: [simNao] };
    sheet.getCell(r, 15).dataValidation = { type: "whole", operator: "greaterThanOrEqual", formulae: [0], allowBlank: true };
    sheet.getCell(r, 16).dataValidation = { type: "whole", operator: "greaterThanOrEqual", formulae: [0], allowBlank: true };
    sheet.getCell(r, 17).dataValidation = { type: "list", allowBlank: true, formulae: [simNao] };
    sheet.getCell(r, 18).dataValidation = { type: "list", allowBlank: true, formulae: [simNao] };
  }

  // Allow user to resize columns/rows, use filters and sort while sheet is protected
  sheet.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: true,
    formatRows: true,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    sort: true,
    autoFilter: true,
  });

  // Auto-filter on header + data range
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: lastDataRow, column: HEADERS.length },
  };

  // Default column widths for readability (user can resize)
  const colWidths: (number | undefined)[] = [12, 14, 12, 22, 28, 28, 10, 14, 14, 14, 14, 14, 8, 6, 8, 6, 8, 8];
  HEADERS.forEach((_, i) => {
    const w = colWidths[i];
    if (w != null) sheet.getColumn(i + 1).width = w;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
