/**
 * Patch do template .xlsm como ZIP: substitui apenas <sheetData> e <dimension>
 * na folha "Menu", preservando desenhos e botões (Form controls).
 * Garante proteção da folha (sheetProtection) e células bloqueadas/editáveis via estilos.
 * SheetJS não preserva Form controls ao escrever; esta abordagem mantém o resto do ficheiro intacto.
 */

import JSZip from "jszip";
import type { MenuExcelRow } from "./menu-excel-export";

const MENU_SHEET_NAME = "Menu";

/** Colunas bloqueadas (0-based): Tenant, Loja, Código, Preço, Familia, Sub Familia. Alinhado a menu-excel-export LOCKED_COLUMNS. */
const LOCKED_COLUMNS = new Set([0, 1, 2, 6, 8, 9]);

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

/** Lista para validação tipo list: limite 255 caracteres; escape para fórmula Excel. */
function listFormulaForValidation(values: string[]): string {
  const escaped = values.map((v) => (v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v));
  const s = escaped.join(",");
  if (s.length <= 255) return `"${s}"`;
  return `"${escaped.slice(0, 20).join(",")}"`;
}

/** Colunas de validação (0-based): H=7 Tipo, K=10 Secção, L=11 Categoria, M=12 Promo, N=13 TA, O=14 Tempo, P=15 Ordem, Q=16 Visível, R=17 Destaque. */
const COL_TIPO = 7;
const COL_SECCAO = 10;
const COL_CATEGORIA = 11;
const COL_PROMO = 12;
const COL_TA = 13;
const COL_TEMPO_PREP = 14;
const COL_ORDEM = 15;
const COL_VISIVEL = 16;
const COL_DESTAQUE = 17;

function buildDataValidationsXml(
  lastDataRow: number,
  typeNames: string[],
  sectionNames: string[],
  categoryNames: string[]
): string {
  if (lastDataRow < 2) return "";
  const sqref = (colIdx: number) => {
    const letter = colLetter(colIdx);
    return `${letter}2:${letter}${lastDataRow}`;
  };
  const typeList = listFormulaForValidation(typeNames.length ? typeNames : ["—"]);
  const sectionList = listFormulaForValidation(sectionNames.length ? sectionNames : ["—"]);
  const categoryList = listFormulaForValidation(categoryNames.length ? categoryNames : ["—"]);
  const simNao = '"Sim,Não"';
  const validations: string[] = [
    `<dataValidation type="list" allowBlank="1" sqref="${sqref(COL_TIPO)}"><formula1>${escapeXml(typeList)}</formula1></dataValidation>`,
    `<dataValidation type="list" allowBlank="1" sqref="${sqref(COL_SECCAO)}"><formula1>${escapeXml(sectionList)}</formula1></dataValidation>`,
    `<dataValidation type="list" allowBlank="1" sqref="${sqref(COL_CATEGORIA)}"><formula1>${escapeXml(categoryList)}</formula1></dataValidation>`,
    `<dataValidation type="list" allowBlank="1" sqref="${sqref(COL_PROMO)}"><formula1>${escapeXml(simNao)}</formula1></dataValidation>`,
    `<dataValidation type="list" allowBlank="1" sqref="${sqref(COL_TA)}"><formula1>${escapeXml(simNao)}</formula1></dataValidation>`,
    `<dataValidation type="whole" operator="greaterThanOrEqual" allowBlank="1" sqref="${sqref(COL_TEMPO_PREP)}"><formula1>0</formula1></dataValidation>`,
    `<dataValidation type="whole" operator="greaterThanOrEqual" allowBlank="1" sqref="${sqref(COL_ORDEM)}"><formula1>0</formula1></dataValidation>`,
    `<dataValidation type="list" allowBlank="1" sqref="${sqref(COL_VISIVEL)}"><formula1>${escapeXml(simNao)}</formula1></dataValidation>`,
    `<dataValidation type="list" allowBlank="1" sqref="${sqref(COL_DESTAQUE)}"><formula1>${escapeXml(simNao)}</formula1></dataValidation>`,
  ];
  return `<dataValidations count="${validations.length}">${validations.join("")}</dataValidations>`;
}

function buildSheetDataXml(
  tenantLabel: string,
  storeLabel: string,
  rows: MenuExcelRow[],
  lockedStyleIndex: number,
  unlockedStyleIndex: number
): string {
  const lines: string[] = [];

  const cell = (
    ref: string,
    content: string,
    isNumber: boolean,
    colIndex: number
  ) => {
    const s = LOCKED_COLUMNS.has(colIndex) ? lockedStyleIndex : unlockedStyleIndex;
    const sAttr = ` s="${s}"`;
    if (isNumber) return `<c r="${ref}"${sAttr}><v>${content}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${sAttr}><is><t>${content}</t></is></c>`;
  };

  // Row 1: headers
  const headerCells = HEADERS.map((h, c) => {
    const ref = colLetter(c) + "1";
    const text = escapeXml(h);
    return cell(ref, text, false, c);
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
        return cell(ref, String(v), true, c);
      }
      return cell(ref, escapeXml(String(v)), false, c);
    });
    lines.push(`<row r="${rowNum}" spans="1:18">${cells.join("")}</row>`);
  }

  return `<sheetData>${lines.join("")}</sheetData>`;
}

/** Permissões da folha: permitir formatar células e colunas (largura), ordenar; não permitir formatar linhas nem AutoFilter (conforme PERMISSÕES_EXCEL). */
const SHEET_PROTECTION_XML =
  '<sheetProtection sheet="1" objects="1" scenarios="1" formatCells="1" formatColumns="1" formatRows="0" insertColumns="0" insertRows="0" insertHyperlinks="0" deleteColumns="0" deleteRows="0" selectLockedCells="1" selectUnlockedCells="1" sort="1" autoFilter="0"/>';

/**
 * Obtém índices de estilo locked/unlocked a partir de xl/styles.xml.
 * Se não existir um xf com protection locked="0", adiciona um e devolve o novo índice.
 */
function getOrCreateStyleIndices(stylesXml: string): {
  lockedIndex: number;
  unlockedIndex: number;
  stylesXml: string;
  stylesModified: boolean;
} {
  const cellXfsMatch = stylesXml.match(/<cellXfs([^>]*)>([\s\S]*?)<\/cellXfs>/);
  if (!cellXfsMatch) {
    return { lockedIndex: 0, unlockedIndex: 0, stylesXml, stylesModified: false };
  }
  const inner = cellXfsMatch[2];
  const xfRegex = /<xf\s[^>]*>[\s\S]*?<\/xf>|<xf\s[^/]*\/>/g;
  const xfMatches = inner.match(xfRegex) ?? [];
  let unlockedIndex = -1;
  let lockedIndex = -1;
  for (let i = 0; i < xfMatches.length; i++) {
    const xf = xfMatches[i];
    if (/<protection[^>]*locked="0"/.test(xf)) unlockedIndex = i;
    if (/<protection[^>]*locked="1"/.test(xf) && lockedIndex < 0) lockedIndex = i;
  }
  if (lockedIndex < 0) lockedIndex = 0;
  if (unlockedIndex >= 0) {
    return {
      lockedIndex,
      unlockedIndex,
      stylesXml,
      stylesModified: false,
    };
  }
  const firstXf = xfMatches[0];
  if (!firstXf) {
    return { lockedIndex: 0, unlockedIndex: 0, stylesXml, stylesModified: false };
  }
  let insertedXf: string;
  if (firstXf.trimEnd().endsWith("/>")) {
    insertedXf = firstXf.replace(/\/\s*>$/, ' applyProtection="1"><protection locked="0"/></xf>');
  } else {
    let xf = firstXf;
    if (/<protection[^>]*locked="1"/.test(xf)) {
      xf = xf.replace(/<protection[^>]*locked="1"[^/]*\/>/, "<protection locked=\"0\"/>");
    } else {
      xf = xf.replace(/<\/xf>/, "<protection locked=\"0\"/></xf>");
    }
    if (!/applyProtection="1"/.test(xf)) {
      xf = xf.replace(/^<xf\s/, '<xf applyProtection="1" ');
    }
    insertedXf = xf;
  }
  const newInner = inner + insertedXf;
  const newCount = xfMatches.length + 1;
  const newCellXfs = `<cellXfs${cellXfsMatch[1].replace(/count="\d+"/, `count="${newCount}"`)}>${newInner}</cellXfs>`;
  const newStylesXml = stylesXml.replace(
    /<cellXfs[^>]*>[\s\S]*?<\/cellXfs>/,
    newCellXfs
  );
  return {
    lockedIndex,
    unlockedIndex: xfMatches.length,
    stylesXml: newStylesXml,
    stylesModified: true,
  };
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
  typeNames: string[];
  sectionNames: string[];
  categoryNames: string[];
};

/**
 * Patches the template .xlsm: replaces only sheetData and dimension in the Menu sheet.
 * Returns the new file buffer or null on error (caller can fallback to SheetJS export).
 */
export async function patchMenuExportXlsm(
  params: PatchXlsmParams
): Promise<Buffer | null> {
  const { templateBuffer, tenantLabel, storeLabel, rows, typeNames, sectionNames, categoryNames } = params;

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
    const stylesFile = zip.file("xl/styles.xml");
    if (!sheetFile) return null;

    let [sheetXml, stylesXml] = await Promise.all([
      sheetFile.async("string"),
      stylesFile ? stylesFile.async("string") : Promise.resolve(""),
    ]);

    let lockedStyleIndex = 0;
    let unlockedStyleIndex = 0;
    if (stylesXml) {
      const styleResult = getOrCreateStyleIndices(stylesXml);
      lockedStyleIndex = styleResult.lockedIndex;
      unlockedStyleIndex = styleResult.unlockedIndex;
      if (styleResult.stylesModified) {
        zip.file("xl/styles.xml", styleResult.stylesXml);
      }
    }

    const lastRow = rows.length + 1;
    const lastColLetter = colLetter(HEADERS.length - 1);
    const newDimension = `<dimension ref="A1:${lastColLetter}${lastRow}"/>`;
    const newSheetData = buildSheetDataXml(
      tenantLabel,
      storeLabel,
      rows,
      lockedStyleIndex,
      unlockedStyleIndex
    );

    sheetXml = sheetXml.replace(/<dimension\s+ref="[^"]*"\s*\/>/, newDimension);
    sheetXml = sheetXml.replace(
      /<sheetData>[\s\S]*?<\/sheetData>/,
      newSheetData
    );

    if (!sheetXml.includes("<sheetProtection")) {
      sheetXml = sheetXml.replace(
        /(<\/sheetData>)/,
        `$1${SHEET_PROTECTION_XML}`
      );
    }

    const lastDataRow = rows.length + 1;
    const dataValidationsXml = buildDataValidationsXml(lastDataRow, typeNames, sectionNames, categoryNames);
    if (dataValidationsXml) {
      if (sheetXml.includes("<dataValidations")) {
        sheetXml = sheetXml.replace(/<dataValidations[^>]*>[\s\S]*?<\/dataValidations>/, dataValidationsXml);
      } else {
        if (sheetXml.includes("<sheetProtection")) {
          sheetXml = sheetXml.replace(/(<sheetProtection[^/]*\/>)/, `$1${dataValidationsXml}`);
        } else {
          sheetXml = sheetXml.replace(/(<\/sheetData>)/, `$1${dataValidationsXml}`);
        }
      }
    }

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
