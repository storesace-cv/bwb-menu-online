/**
 * Geração do ficheiro Excel para Actualizações ao Menu.
 * Colunas: Tenant, Loja, Código, Nome, Preço, Tipo, Familia, Sub Familia, Secção, Categoria, Promo, TA, Tempo prep., Ordem, Visível, Destaque.
 * Células bloqueadas: Tenant, Loja, Código, Preço, Familia, Sub Familia.
 * Validação: listas para Tipo, Secção, Categoria, Promo, TA, Visível, Destaque; numérico para Tempo prep. e Ordem.
 */

import ExcelJS from "exceljs";

const HEADERS = [
  "Tenant",
  "Loja",
  "Código",
  "Nome",
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

/** Colunas bloqueadas (0-based): 0 Tenant, 1 Loja, 2 Código, 4 Preço, 6 Familia, 7 Sub Familia */
const LOCKED_COLUMNS = new Set([0, 1, 2, 4, 6, 7]);

export type MenuExcelRow = {
  item_code: string | null;
  menu_name: string | null;
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
};

/** Excel list validation has a 255 character limit; truncate or use first N values if needed */
function listFormula(values: string[]): string {
  const escaped = values.map((v) => (v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v));
  const s = escaped.join(",");
  if (s.length <= 255) return `"${s}"`;
  return `"${escaped.slice(0, 20).join(",")}"`;
}

export async function buildMenuUpdatesWorkbook(params: MenuExcelExportParams): Promise<Buffer> {
  const { tenantLabel, storeLabel, rows, typeNames, sectionNames, categoryNames } = params;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Menu", { views: [{ state: "frozen", ySplit: 1 }] });

  // Header row
  const headerRow = sheet.getRow(1);
  HEADERS.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  headerRow.font = { bold: true };

  // Data rows
  rows.forEach((row, idx) => {
    const r = sheet.getRow(idx + 2);
    r.getCell(1).value = tenantLabel;
    r.getCell(2).value = storeLabel;
    r.getCell(3).value = row.item_code ?? "";
    r.getCell(4).value = row.menu_name ?? "";
    r.getCell(5).value = row.price != null ? Number(row.price) : "";
    r.getCell(6).value = row.type_name;
    r.getCell(7).value = row.familia;
    r.getCell(8).value = row.sub_familia;
    r.getCell(9).value = row.section_name;
    r.getCell(10).value = row.category_name;
    r.getCell(11).value = row.promo;
    r.getCell(12).value = row.ta;
    r.getCell(13).value = row.prep_minutes != null ? row.prep_minutes : "";
    r.getCell(14).value = row.sort_order != null ? row.sort_order : "";
    r.getCell(15).value = row.is_visible;
    r.getCell(16).value = row.is_featured;
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
  const categoryList = listFormula(categoryNames.length ? categoryNames : ["—"]);
  const simNao = '"Sim,Não"';

  for (let r = 2; r <= lastDataRow; r++) {
    sheet.getCell(r, 6).dataValidation = { type: "list", allowBlank: true, formulae: [typeList] };
    sheet.getCell(r, 9).dataValidation = { type: "list", allowBlank: true, formulae: [sectionList] };
    sheet.getCell(r, 10).dataValidation = { type: "list", allowBlank: true, formulae: [categoryList] };
    sheet.getCell(r, 11).dataValidation = { type: "list", allowBlank: true, formulae: [simNao] };
    sheet.getCell(r, 12).dataValidation = { type: "list", allowBlank: true, formulae: [simNao] };
    sheet.getCell(r, 13).dataValidation = { type: "whole", operator: "greaterThanOrEqual", formulae: [0], allowBlank: true };
    sheet.getCell(r, 14).dataValidation = { type: "whole", operator: "greaterThanOrEqual", formulae: [0], allowBlank: true };
    sheet.getCell(r, 15).dataValidation = { type: "list", allowBlank: true, formulae: [simNao] };
    sheet.getCell(r, 16).dataValidation = { type: "list", allowBlank: true, formulae: [simNao] };
  }

  sheet.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    sort: false,
    autoFilter: false,
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
