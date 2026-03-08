import type { ReactNode } from "react";

export type SortDirection = "asc" | "desc";

export type SortRule = {
  key: string;
  direction: SortDirection;
  type: "text" | "number" | "date" | "datetime";
};

export type ColumnDef<T> = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "datetime";
  sortable?: boolean;
  accessor?: (row: T) => unknown;
  render?: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  /** When set, used as the entire header cell content (no sort indicator). */
  headerRender?: ReactNode;
};

/**
 * Normalize string for sorting: lowercase + NFD + strip diacritics.
 */
export function normalizeForSort(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Parse value as date; return timestamp or null.
 */
export function parseDate(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  const d = new Date(val as string | number | Date);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * Parse value as datetime; accept "YYYY-MM-DD HH:mm" by replacing space with "T".
 */
export function parseDateTime(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  let s = typeof val === "string" ? val.trim() : String(val);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
    s = s.replace(" ", "T");
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * Check if all values in the array are numeric (for auto-detect in text columns).
 */
export function isAllNumeric(values: unknown[]): boolean {
  if (values.length === 0) return false;
  for (const v of values) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s === "") continue;
    const n = Number(s);
    if (Number.isNaN(n)) return false;
  }
  return true;
}

/**
 * Toggle sort for a column: add as last ASC → ASC→DESC → DESC→remove.
 */
export function toggleSort(
  current: SortRule[],
  rule: Omit<SortRule, "direction">
): SortRule[] {
  const idx = current.findIndex((r) => r.key === rule.key);
  if (idx === -1) {
    return [...current, { ...rule, direction: "asc" }];
  }
  const existing = current[idx];
  if (existing.direction === "asc") {
    const next = [...current];
    next[idx] = { ...existing, direction: "desc" };
    return next;
  }
  return current.filter((r) => r.key !== rule.key);
}

function getCompareValue<T>(
  row: T,
  rule: SortRule,
  col: ColumnDef<T>,
  allValues: unknown[],
  useNumericAutoDetect: boolean
): { raw: unknown; norm: string; num: number | null; ts: number | null } {
  const raw = col.accessor ? col.accessor(row) : (row as Record<string, unknown>)[col.key];
  const norm =
    raw != null && typeof raw === "string"
      ? normalizeForSort(raw)
      : raw != null
        ? normalizeForSort(String(raw))
        : "";
  let num: number | null = null;
  if (typeof raw === "number" && !Number.isNaN(raw)) num = raw;
  else if (raw != null && raw !== "") {
    const n = Number(raw);
    if (!Number.isNaN(n)) num = n;
  }
  let ts: number | null = null;
  if (col.type === "date") ts = parseDate(raw);
  else if (col.type === "datetime") ts = parseDateTime(raw);

  const effectiveType =
    col.type === "text" && useNumericAutoDetect && isAllNumeric(allValues)
      ? "number"
      : col.type;

  return {
    raw,
    norm,
    num: effectiveType === "number" ? num : null,
    ts: effectiveType === "date" || effectiveType === "datetime" ? ts : null,
  };
}

/**
 * Sort rows by sort rules (multi-level). Uses original index as tie-breaker for stability.
 */
export function sortData<T>(
  rows: T[],
  sort: SortRule[],
  columns: ColumnDef<T>[]
): T[] {
  if (sort.length === 0) return [...rows];
  const colByKey = new Map(columns.map((c) => [c.key, c]));

  const indexed = rows.map((row, index) => ({ row, index }));

  indexed.sort((a, b) => {
    for (const rule of sort) {
      const col = colByKey.get(rule.key);
      if (!col || col.sortable === false) continue;
      const accessor = col.accessor ?? ((r: T) => (r as Record<string, unknown>)[col.key]);
      const allValues = rows.map(accessor);
      const useNumericAutoDetect = col.type === "text";
      const va = getCompareValue(a.row, rule, col, allValues, useNumericAutoDetect);
      const vb = getCompareValue(b.row, rule, col, allValues, useNumericAutoDetect);

      let cmp = 0;
      const nullLast = rule.direction === "asc" ? Infinity : -Infinity;
      if (col.type === "number" || (col.type === "text" && isAllNumeric(allValues))) {
        const na = va.num ?? nullLast;
        const nb = vb.num ?? nullLast;
        cmp = na - nb;
      } else if (col.type === "date" || col.type === "datetime") {
        const ta = va.ts ?? nullLast;
        const tb = vb.ts ?? nullLast;
        cmp = ta - tb;
      } else {
        cmp = va.norm.localeCompare(vb.norm);
      }
      if (cmp !== 0) return rule.direction === "asc" ? cmp : -cmp;
    }
    return a.index - b.index;
  });

  return indexed.map(({ row }) => row);
}
