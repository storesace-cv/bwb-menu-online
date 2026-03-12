#!/usr/bin/env node
/**
 * Gera menu-export-template.xlsm com folha "Menu" e cabeçalhos A–R.
 * O ficheiro é escrito em public/templates/menu-export-template.xlsm.
 * Para incluir as macros VBA: abra o ficheiro no Excel, adicione o módulo
 * com o conteúdo de docs/excel-vba-replace-column-d.bas, guarde.
 * Ver docs/EXCEL_TEMPLATE_MENU_EXPORT.md.
 */
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

const ws = XLSX.utils.aoa_to_sheet([MENU_EXPORT_HEADERS]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Menu");

const outDir = path.join(__dirname, "..", "public", "templates");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "menu-export-template.xlsm");

const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsm" });
fs.writeFileSync(outPath, buffer);
console.log("Written:", outPath);
