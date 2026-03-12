/**
 * Patch do template .xlsm como ZIP: substitui apenas <sheetData> e <dimension>
 * na folha "Menu", preservando desenhos e botões (Form controls).
 * SheetJS não preserva Form controls ao escrever; esta abordagem mantém o resto do ficheiro intacto.
 */

import JSZip from "jszip";
import type { MenuExcelRow } from "./menu-excel-export";

const MENU_SHEET_NAME = "Menu";
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
];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function colLetter(colIndex: number): string {
  if (colIndex < 26) return String.fromCharCode(65 + colIndex);
  return (
    String.fromCharCode(64 + Math.floor(colIndex / 26)) +
    String.fromCharCode(65 + (colIndex % 26))
  );
}

function buildSheetDataXml(
  tenantLabel: string,
  storeLabel: string,
  rows: MenuExcelRow[]
): string {
  const lines: string[] = [];

  // Row 1: headers
  const headerCells = HEADERS.map((h, c) => {
    const ref = colLetter(c) + "1";
    const text = escapeXml(h);
    return `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
  });
  lines.push(`<row r="1" spans="1:18">${headerCells.join("")}</row>`);

  // Data rows
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const rowNum = r + 2;
    const values: (string | number)[] = [
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
    const cells = values.map((v, c) => {
      const ref = colLetter(c) + String(rowNum);
      if (typeof v === "number") {
        return `<c r="${ref}"><v>${v}</v></c>`;
      }
      const text = escapeXml(String(v));
      return `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
    });
    lines.push(`<row r="${rowNum}" spans="1:18">${cells.join("")}</row>`);
  }

  return `<sheetData>${lines.join("")}</sheetData>`;
}

/**
 * Resolve the worksheet file path for the sheet named "Menu" from workbook and rels.
 */
function getMenuSheetPath(workbookXml: string, relsXml: string): string | null {
  const nameMatch = workbookXml.match(
    /<sheet\s+name="Menu"[^>]*\s+r:id="([^"]+)"/
  );
  if (!nameMatch) return null;
  const rId = nameMatch[1];
  const relMatch = new RegExp(
    `<Relationship\\s+Id="${rId}"[^>]*Target="([^"]+)"`,
    "i"
  ).exec(relsXml);
  if (!relMatch) return null;
  const target = relMatch[1];
  return "xl/" + target.replace(/^\//, "");
}

export type PatchXlsmParams = {
  templateBuffer: Buffer;
  tenantLabel: string;
  storeLabel: string;
  rows: MenuExcelRow[];
};

/**
 * Patches the template .xlsm: replaces only sheetData and dimension in the Menu sheet.
 * Returns the new file buffer or null on error (caller can fallback to SheetJS export).
 */
export async function patchMenuExportXlsm(
  params: PatchXlsmParams
): Promise<Buffer | null> {
  const { templateBuffer, tenantLabel, storeLabel, rows } = params;

  try {
    const zip = await JSZip.loadAsync(templateBuffer);

    const workbookFile = zip.file("xl/workbook.xml");
    const relsFile = zip.file("xl/_rels/workbook.xml.rels");
    if (!workbookFile || !relsFile) return null;

    const [workbookXml, relsXml] = await Promise.all([
      workbookFile.async("string"),
      relsFile.async("string"),
    ]);

    const sheetPath = getMenuSheetPath(workbookXml, relsXml);
    if (!sheetPath) return null;

    const sheetFile = zip.file(sheetPath);
    if (!sheetFile) return null;

    let sheetXml = await sheetFile.async("string");

    const lastRow = rows.length + 1;
    const lastColLetter = colLetter(HEADERS.length - 1);
    const newDimension = `<dimension ref="A1:${lastColLetter}${lastRow}"/>`;
    const newSheetData = buildSheetDataXml(tenantLabel, storeLabel, rows);

    sheetXml = sheetXml.replace(/<dimension\s+ref="[^"]*"\s*\/>/, newDimension);
    sheetXml = sheetXml.replace(
      /<sheetData>[\s\S]*?<\/sheetData>/,
      newSheetData
    );

    zip.file(sheetPath, sheetXml);

    const outBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    return outBuffer as Buffer;
  } catch {
    return null;
  }
}
