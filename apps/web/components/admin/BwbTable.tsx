"use client";

import React, { useState, useMemo } from "react";
import { TableContainer } from "./TableContainer";
import {
  type ColumnDef,
  type SortRule,
  toggleSort,
  sortData,
} from "@/lib/admin/bwbTableSort";

export type { ColumnDef, SortRule } from "@/lib/admin/bwbTableSort";

type BwbTableProps<T> = {
  id?: string;
  columns: ColumnDef<T>[];
  rows: T[];
  defaultSort?: SortRule[];
  /** Controlled sort: when both provided, sort is driven by parent (e.g. for persisting to localStorage) */
  sortRules?: SortRule[];
  onSortChange?: (rules: SortRule[]) => void;
  tableClassName?: string;
  /** Stable key per row (e.g. row => row.id) for list reconciliation when reordering */
  rowKey?: (row: T) => string | number;
  /** Optional row class (e.g. opacity-70 for deleted rows) */
  getRowClassName?: (row: T) => string;
};

export function BwbTable<T>({
  id,
  columns,
  rows,
  defaultSort = [],
  sortRules: controlledSortRules,
  onSortChange,
  tableClassName = "",
  rowKey,
  getRowClassName,
}: BwbTableProps<T>) {
  const [internalSortRules, setInternalSortRules] = useState<SortRule[]>(defaultSort);
  const isControlled = controlledSortRules != null && onSortChange != null;
  const sortRules = isControlled ? controlledSortRules : internalSortRules;

  const sortedRows = useMemo(
    () => sortData(rows, sortRules, columns),
    [rows, sortRules, columns]
  );

  const getSortIndex = (key: string): number => {
    const i = sortRules.findIndex((r) => r.key === key);
    return i === -1 ? -1 : i + 1;
  };

  return (
    <TableContainer>
      <table
        id={id}
        className={`w-full border-collapse ${tableClassName}`.trim()}
      >
        <thead>
          <tr className="border-b-2 border-slate-600">
            {columns.map((col) => {
              const sortable = col.sortable !== false;
              const rule = sortRules.find((r) => r.key === col.key);
              const sortIndex = getSortIndex(col.key);
              const isMulti = sortRules.length > 1;
              const hasHeaderRender = "headerRender" in col && col.headerRender != null;

              return (
                <th
                  key={col.key}
                  className={`text-left py-2 px-3 text-slate-300 ${col.headerClassName ?? ""}`.trim()}
                  aria-sort={
                    !hasHeaderRender && rule
                      ? rule.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {hasHeaderRender ? (
                    col.headerRender
                  ) : sortable ? (
                    <button
                      type="button"
                      onClick={() => {
                        const next = toggleSort(sortRules, { key: col.key, type: col.type });
                        if (isControlled) onSortChange(next);
                        else setInternalSortRules(next);
                      }}
                      className="text-left font-medium text-slate-300 hover:text-slate-100 w-full"
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}{" "}
                        {rule ? (
                          <span className="text-emerald-400">
                            {isMulti && (
                              <span className="font-normal text-slate-400">
                                {sortIndex}
                              </span>
                            )}{" "}
                            {rule.direction === "asc" ? "↑" : "↓"}
                          </span>
                        ) : (
                          <span className="text-slate-500" aria-hidden>
                            ⇅
                          </span>
                        )}
                      </span>
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, rowIndex) => (
            <tr
              key={rowKey ? rowKey(row) : rowIndex}
              className={`border-b border-slate-700 ${getRowClassName?.(row) ?? ""}`.trim()}
            >
              {columns.map((col) => {
                const raw = col.render
                  ? col.render(row)
                  : col.accessor
                    ? col.accessor(row)
                    : (row as Record<string, unknown>)[col.key];
                const cellContent: React.ReactNode =
                  raw == null || raw === ""
                    ? "—"
                    : typeof raw === "object" && raw !== null && !React.isValidElement(raw)
                      ? String(raw)
                      : (raw as React.ReactNode);
                return (
                  <td
                    key={col.key}
                    className={`py-2 px-3 text-slate-200 ${col.cellClassName ?? ""}`.trim()}
                  >
                    {cellContent}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </TableContainer>
  );
}
