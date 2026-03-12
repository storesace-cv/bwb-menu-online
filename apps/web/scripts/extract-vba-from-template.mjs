#!/usr/bin/env node
/**
 * Extrai o blob VBA do template menu-export-template.xlsm e grava em vbaProject.bin.
 * Uso único no projeto: depois de adicionar o módulo VBA ao template no Excel e guardar,
 * execute este script e faça commit de public/templates/vbaProject.bin.
 * O ficheiro exportado pela API incluirá então as macros sem o utilizador final precisar
 * de abrir o Excel. Ver docs/EXCEL_TEMPLATE_MENU_EXPORT.md.
 */
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATE_CANDIDATES = [
  path.join(process.cwd(), "public", "templates", "menu-export-template.xlsm"),
  path.join(process.cwd(), "apps", "web", "public", "templates", "menu-export-template.xlsm"),
];

function getTemplatePath() {
  for (const p of TEMPLATE_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const templatePath = getTemplatePath();
if (!templatePath) {
  console.error(
    "menu-export-template.xlsm não encontrado. Procure em public/templates/ ou apps/web/public/templates/."
  );
  process.exit(1);
}

const templateBuffer = fs.readFileSync(templatePath);
const wb = XLSX.read(templateBuffer, { type: "buffer", bookVBA: true });
const vbaraw = wb.vbaraw;

if (!vbaraw) {
  console.error(
    "O template não contém VBA. Abra menu-export-template.xlsm no Excel, adicione o módulo com o conteúdo de docs/excel-vba-replace-column-d.bas, guarde e execute este script novamente."
  );
  process.exit(1);
}

const outDir = path.dirname(templatePath);
const outPath = path.join(outDir, "vbaProject.bin");
const bin = Buffer.isBuffer(vbaraw) ? vbaraw : Buffer.from(vbaraw);
fs.writeFileSync(outPath, bin);
console.log("vbaProject.bin gravado em:", outPath);
console.log("Faça commit deste ficheiro para que o export inclua as macros.");
