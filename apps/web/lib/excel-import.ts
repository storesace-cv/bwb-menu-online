/**
 * Excel import: template detection by headers, read first sheet, normalize rows.
 * Used by POST /api/portal-admin/import/excel. Server-only (Node buffer + xlsx).
 */

import * as XLSX from "xlsx";
import { createHash } from "crypto";

export type ExcelTemplateType = "excel_netbo" | "excel_zsbms";

const NETBO_REQUIRED = ["Produto", "Teclado", "IVA1"];
const ZSBMS_REQUIRED = ["Loja", "Descrição", "Sub Família"];

/** Normalize header for comparison: trim; accept "Sub Familia" as "Sub Família" */
function normalizeHeader(h: string): string {
  return (h ?? "").trim().replace(/\s+/g, " ");
}

/** Check if header list contains all of required (after normalize). */
function hasHeaders(rawHeaders: string[], required: string[]): boolean {
  const set = new Set(rawHeaders.map(normalizeHeader));
  for (const r of required) {
    const n = normalizeHeader(r);
    if (!set.has(n)) {
      const alt = n === "Sub Família" ? "Sub Familia" : null;
      if (!alt || !set.has(alt)) return false;
    }
  }
  return true;
}

/** Detect template from first row (headers). Throws if unknown. */
export function detectTemplate(headers: string[]): ExcelTemplateType {
  const normalized = headers.map(normalizeHeader);
  if (hasHeaders(normalized, NETBO_REQUIRED)) return "excel_netbo";
  if (hasHeaders(normalized, ZSBMS_REQUIRED)) return "excel_zsbms";
  throw new Error(
    `Template não reconhecido. Headers encontrados: ${headers.slice(0, 15).join(", ")}${headers.length > 15 ? "..." : ""}`
  );
}

/** Map Excel header (as in file) to snake_case column name. */
const NETBO_HEADER_TO_COL: Record<string, string> = {
  "Código": "codigo",
  Produto: "produto",
  Teclado: "teclado",
  Familia: "familia",
  "Sub Familia": "sub_familia",
  "Sub Família": "sub_familia",
  "Afeta Stk": "afeta_stk",
  "Un Stock": "un_stock",
  "Un Venda": "un_venda",
  "Tipo Mercad": "tipo_mercad",
  "Un Inv.": "un_inv",
  "Menu?": "menu_flag",
  PVP1: "pvp1",
  PVP2: "pvp2",
  PVP3: "pvp3",
  PVP4: "pvp4",
  PVP5: "pvp5",
  IVA1: "iva1",
  IVA2: "iva2",
  Ativo: "ativo",
  "Nome curto": "nome_curto",
  "Nome botão": "nome_botao",
  "Zona Impr": "zona_impr",
  "Pede Peso": "pede_peso",
  "Pede Preço": "pede_preco",
  Extra: "extra",
  "Cod. Barras": "cod_barras",
  "Cod. Comando": "cod_comando",
  "Cod. Barras Antigo": "cod_barras_antigo",
};

const ZSBMS_HEADER_TO_COL: Record<string, string> = {
  Loja: "loja_raw",
  "Código": "codigo",
  Descrição: "descricao",
  Familia: "familia",
  "Sub Família": "sub_familia",
  "Sub Familia": "sub_familia",
  PVP1: "pvp1",
  PVP2: "pvp2",
  PVP3: "pvp3",
  PVP4: "pvp4",
  PVP5: "pvp5",
};

const PVP_KEYS_ZSBM = ["pvp1", "pvp2", "pvp3", "pvp4", "pvp5"] as const;

/**
 * Normalize PVP value for excel_zsbms: remove spaces, accept . or , as decimal (output with .),
 * remove trailing letters/currency (e.g. "EUR", "€").
 */
function normalizePvpValueForZsbm(raw: string): string {
  if (raw == null || typeof raw !== "string") return "";
  let s = raw.replace(/\s/g, "");
  while (s.length > 0 && /[A-Za-z€$]/.test(s[s.length - 1])) {
    s = s.slice(0, -1);
  }
  if (!s) return "";
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    const lastSep = Math.max(lastComma, lastDot);
    const intPart = s.slice(0, lastSep).replace(/[.,]/g, "");
    const decPart = s.slice(lastSep + 1);
    return intPart ? `${intPart}.${decPart}` : decPart ? `0.${decPart}` : "";
  }
  if (hasComma) return s.replace(/,/g, ".");
  return s;
}

function mapRow(headers: string[], values: unknown[], headerToCol: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const col = headerToCol[normalizeHeader(headers[i])] ?? headers[i].replace(/\s+/g, "_").toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (col) {
      const v = values[i];
      out[col] = v == null ? "" : String(v).trim();
    }
  }
  return out;
}

/** Compute SHA-256 hex of content (for row_hash or file_hash). */
export function sha256Hex(content: string | Buffer): string {
  const buf = typeof content === "string" ? Buffer.from(content, "utf8") : content;
  return createHash("sha256").update(buf).digest("hex");
}

export function rowHash(row: Record<string, string>): string {
  const keys = Object.keys(row).sort();
  const canonical = JSON.stringify(keys.map((k) => [k, row[k]]));
  return sha256Hex(canonical);
}

export function fileHash(buffer: Buffer): string {
  return sha256Hex(buffer);
}

export type ReadExcelResult = {
  detectedType: ExcelTemplateType;
  headers: string[];
  rows: Record<string, string>[];
  fileHash: string;
};

/**
 * Read first sheet of XLSX buffer; detect template; return normalized rows (snake_case keys).
 * All cell values normalized to string (raw immutable).
 */
export function readExcel(buffer: Buffer): ReadExcelResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellText: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Ficheiro Excel sem sheets.");
  }
  const sheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
  if (!data.length) {
    throw new Error("Primeira sheet vazia.");
  }
  const headerRow = data[0];
  const headers = headerRow.map((c) => (c == null ? "" : String(c)));
  const detectedType = detectTemplate(headers);
  const headerToCol = detectedType === "excel_netbo" ? NETBO_HEADER_TO_COL : ZSBMS_HEADER_TO_COL;
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < data.length; i++) {
    const values = data[i] as unknown[];
    const row = mapRow(headers, values, headerToCol);
    if (detectedType === "excel_zsbms") {
      for (const k of PVP_KEYS_ZSBM) {
        if (k in row) row[k] = normalizePvpValueForZsbm(row[k] ?? "");
      }
    }
    const codigo = row.codigo ?? "";
    if (!codigo.trim()) continue;
    rows.push(row);
  }
  return {
    detectedType,
    headers,
    rows,
    fileHash: fileHash(buffer),
  };
}
