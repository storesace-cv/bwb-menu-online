#!/usr/bin/env node
/**
 * Extrai sheetProtection e cellXfs de dois ficheiros .xlsm para comparação.
 * Uso: a partir de apps/web: node scripts/diff-xlsm-protection.mjs original.xlsm regravado.xlsm
 * Ou da raiz: node apps/web/scripts/diff-xlsm-protection.mjs path/original.xlsm path/regravado.xlsm
 * Imprime o XML relevante de cada ficheiro para diff manual (ex.: diff -u out1.txt out2.txt).
 */
import JSZip from "jszip";
import fs from "fs";
import path from "path";

function getMenuSheetPath(workbookXml, relsXml) {
  const nameMatch = workbookXml.match(/<sheet\s+name="Menu"[^>]*\s+r:id="([^"]+)"/);
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

function extractSheetProtection(sheetXml) {
  const m = sheetXml.match(/<sheetProtection[^>]*\/>/);
  return m ? m[0] : "(nenhum sheetProtection)";
}

function extractCellXfs(stylesXml) {
  if (!stylesXml) return "(sem styles.xml)";
  const m = stylesXml.match(/<cellXfs[^>]*>[\s\S]*?<\/cellXfs>/);
  return m ? m[0] : "(nenhum cellXfs)";
}

async function extractFromXlsm(filePath, label) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const workbookFile = zip.file("xl/workbook.xml");
  const relsFile = zip.file("xl/_rels/workbook.xml.rels");
  if (!workbookFile || !relsFile) {
    return { label, error: "workbook.xml ou _rels/workbook.xml.rels não encontrados" };
  }
  const [workbookXml, relsXml] = await Promise.all([
    workbookFile.async("string"),
    relsFile.async("string"),
  ]);
  const sheetPath = getMenuSheetPath(workbookXml, relsXml);
  if (!sheetPath) return { label, error: "Folha 'Menu' não encontrada" };
  const sheetFile = zip.file(sheetPath);
  const stylesFile = zip.file("xl/styles.xml");
  if (!sheetFile) return { label, error: `Ficheiro da folha não encontrado: ${sheetPath}` };
  const [sheetXml, stylesXml] = await Promise.all([
    sheetFile.async("string"),
    stylesFile ? stylesFile.async("string") : Promise.resolve(""),
  ]);
  return {
    label,
    sheetProtection: extractSheetProtection(sheetXml),
    cellXfs: extractCellXfs(stylesXml),
  };
}

const [path1, path2] = process.argv.slice(2);
if (!path1 || !path2) {
  console.error("Uso: node diff-xlsm-protection.mjs <original.xlsm> <regravado.xlsm>");
  process.exit(1);
}

const file1 = path.resolve(process.cwd(), path1);
const file2 = path.resolve(process.cwd(), path2);
if (!fs.existsSync(file1)) {
  console.error("Ficheiro não encontrado:", file1);
  process.exit(1);
}
if (!fs.existsSync(file2)) {
  console.error("Ficheiro não encontrado:", file2);
  process.exit(1);
}

const result1 = await extractFromXlsm(file1, "ORIGINAL");
const result2 = await extractFromXlsm(file2, "REGRAVADO");

if (result1.error) {
  console.error(result1.label, result1.error);
  process.exit(1);
}
if (result2.error) {
  console.error(result2.label, result2.error);
  process.exit(1);
}

console.log("=== " + result1.label + " (sheetProtection) ===\n" + result1.sheetProtection + "\n");
console.log("=== " + result2.label + " (sheetProtection) ===\n" + result2.sheetProtection + "\n");
console.log("=== " + result1.label + " (cellXfs) ===\n" + result1.cellXfs + "\n");
console.log("=== " + result2.label + " (cellXfs) ===\n" + result2.cellXfs);
