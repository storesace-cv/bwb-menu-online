"use client";

import { useState, useMemo, useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { useFormSubmitLoading } from "@/lib/use-form-submit-loading";
import { BwbTable, Button, Card, SubmitButton } from "@/components/admin";
import { sortData, type ColumnDef, type SortRule } from "@/lib/admin/bwbTableSort";
import { batchUpdateItemsSectionCategory } from "../actions";

const MENU_ITEMS_SORT_STORAGE_KEY = "bwb-portal-menu-items-sort";
const MENU_ITEMS_PER_PAGE_STORAGE_KEY = "bwb-portal-menu-items-per-page";
const DEFAULT_SORT: SortRule[] = [{ key: "familia", direction: "asc", type: "text" }];
const SORTABLE_KEYS = new Set(["familia", "sub_familia", "name", "price"]);
const PER_PAGE_OPTIONS = [25, 50, 100, 250] as const;

export type MenuTableItem = {
  id: string;
  menu_name_display: string;
  menu_price_display: number | null;
};

type Section = { id: string; name: string; sort_order: number | null };
type Category = { id: string; name: string; section_id: string | null; sort_order: number | null };
type ArticleType = { id: string; name: string; icon_code?: string | null };

export function MenuItemsTableClient({
  items,
  itemFamilia,
  itemSectionCategory,
  sections,
  categories,
  articleTypes,
  currencyCode = "€",
}: {
  items: MenuTableItem[];
  itemFamilia: Record<string, { familia: string | null; sub_familia: string | null }>;
  itemSectionCategory: Record<string, { sectionName: string; categoryName: string }>;
  sections: Section[];
  categories: Category[];
  articleTypes: ArticleType[];
  currencyCode?: string;
}) {
  const [sortRules, setSortRules] = useState<SortRule[]>(DEFAULT_SORT);
  const [perPage, setPerPage] = useState<number | "all">(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchSectionId, setBatchSectionId] = useState("");
  const [batchCategoryId, setBatchCategoryId] = useState("");

  useEffect(() => {
    try {
      const rawPerPage = localStorage.getItem(MENU_ITEMS_PER_PAGE_STORAGE_KEY);
      if (rawPerPage === "all") setPerPage("all");
      else {
        const n = parseInt(rawPerPage ?? "", 10);
        if (PER_PAGE_OPTIONS.includes(n as (typeof PER_PAGE_OPTIONS)[number])) setPerPage(n);
      }
      const rawSort = localStorage.getItem(MENU_ITEMS_SORT_STORAGE_KEY);
      if (rawSort) {
        const parsed = JSON.parse(rawSort) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(
            (r): r is SortRule =>
              r != null &&
              typeof r === "object" &&
              typeof (r as SortRule).key === "string" &&
              ((r as SortRule).direction === "asc" || (r as SortRule).direction === "desc") &&
              SORTABLE_KEYS.has((r as SortRule).key)
          );
          if (valid.length > 0) setSortRules(valid);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleSortChange = (rules: SortRule[]) => {
    setSortRules(rules);
    try {
      localStorage.setItem(MENU_ITEMS_SORT_STORAGE_KEY, JSON.stringify(rules));
    } catch {
      /* ignore */
    }
  };

  const columnsForSort = useMemo<ColumnDef<MenuTableItem>[]>(
    () => [
      { key: "familia", label: "", type: "text", accessor: (i) => itemFamilia[i.id]?.familia ?? "" },
      { key: "sub_familia", label: "", type: "text", accessor: (i) => itemFamilia[i.id]?.sub_familia ?? "" },
      { key: "name", label: "", type: "text", accessor: (i) => i.menu_name_display },
      { key: "price", label: "", type: "number", accessor: (i) => i.menu_price_display },
    ],
    [itemFamilia]
  );

  const sortedItems = useMemo(
    () => sortData(items, sortRules, columnsForSort),
    [items, sortRules, columnsForSort]
  );

  const perPageNum = perPage === "all" ? 999999 : perPage;
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / perPageNum));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * perPageNum;
  const paginatedRows = useMemo(
    () => sortedItems.slice(startIdx, startIdx + perPageNum),
    [sortedItems, startIdx, perPageNum]
  );

  useEffect(() => {
    if (currentPage > totalPages && totalPages >= 1) setCurrentPage(1);
  }, [currentPage, totalPages]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageSelected =
    paginatedRows.length > 0 && paginatedRows.every((i) => selectedIds.has(i.id));
  const toggleSelectAll = () => {
    if (allOnPageSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginatedRows.map((i) => i.id)));
  };

  const handlePerPageChange = (value: number | "all") => {
    setPerPage(value);
    setCurrentPage(1);
    try {
      localStorage.setItem(MENU_ITEMS_PER_PAGE_STORAGE_KEY, value === "all" ? "all" : String(value));
    } catch {
      /* ignore */
    }
  };

  const router = useRouter();
  const [batchState, batchFormAction] = useFormState(batchUpdateItemsSectionCategory, null);
  const [batchSubmitting, batchFormBind] = useFormSubmitLoading(batchState);

  useEffect(() => {
    if (batchState?.success) {
      setBatchModalOpen(false);
      setSelectedIds(new Set());
      setBatchSectionId("");
      setBatchCategoryId("");
      router.refresh();
    }
  }, [batchState?.success, router]);

  const columns: ColumnDef<MenuTableItem>[] = useMemo(
    () => [
      {
        key: "_select",
        label: "",
        type: "text",
        sortable: false,
        headerRender: (
          <input
            type="checkbox"
            checked={allOnPageSelected}
            onChange={toggleSelectAll}
            aria-label="Selecionar todos na página"
          />
        ),
        headerClassName: "w-10",
        render: (i) => (
          <input
            type="checkbox"
            checked={selectedIds.has(i.id)}
            onChange={() => toggleSelect(i.id)}
            aria-label={`Selecionar ${i.menu_name_display || i.id}`}
          />
        ),
      },
      {
        key: "familia",
        label: "Familia",
        type: "text",
        accessor: (i) => itemFamilia[i.id]?.familia ?? "",
        render: (i) => itemFamilia[i.id]?.familia ?? "—",
      },
      {
        key: "sub_familia",
        label: "Sub Familia",
        type: "text",
        accessor: (i) => itemFamilia[i.id]?.sub_familia ?? "",
        render: (i) => itemFamilia[i.id]?.sub_familia ?? "—",
      },
      {
        key: "name",
        label: "Nome",
        type: "text",
        accessor: (i) => i.menu_name_display,
        render: (i) => i.menu_name_display || "—",
      },
      {
        key: "price",
        label: "Preço",
        type: "number",
        accessor: (i) => i.menu_price_display,
        render: (i) =>
          i.menu_price_display != null
            ? `${Number(i.menu_price_display).toFixed(2)} ${currencyCode}`
            : "—",
      },
    ],
    [itemFamilia, currencyCode, allOnPageSelected, selectedIds]
  );

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-slate-200 font-medium m-0">Lista</h3>
          <Button
            type="button"
            variant="outline"
            onClick={() => setBatchModalOpen(true)}
            disabled={selectedIds.size === 0}
          >
            Alteração em Lote
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-slate-500 py-4">
            Nenhum artigo. Ajuste os filtros ou crie secções e categorias em Definições.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <label className="flex items-center gap-2">
                  Registos por página
                  <select
                    value={perPage === "all" ? "all" : perPage}
                    onChange={(e) => {
                      const v = e.target.value;
                      handlePerPageChange(v === "all" ? "all" : parseInt(v, 10));
                    }}
                    className="px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-200"
                  >
                    {PER_PAGE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                    <option value="all">Todos</option>
                  </select>
                </label>
                <span>
                  A mostrar{" "}
                  {sortedItems.length === 0
                    ? 0
                    : startIdx + 1}
                  –{Math.min(startIdx + perPageNum, sortedItems.length)} de {sortedItems.length}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span>
                  Página {safePage} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Seguinte
                </button>
              </div>
            </div>

            <BwbTable<MenuTableItem>
              columns={columns}
              rows={paginatedRows}
              rowKey={(i) => i.id}
              sortRules={sortRules}
              onSortChange={handleSortChange}
            />
          </>
        )}
      </Card>

      {batchModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setBatchModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Alteração em Lote"
        >
          <div
            className="bg-slate-800 border border-slate-600 rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium text-slate-100 mb-4">Alteração em Lote</h3>
            <p className="text-slate-400 text-sm mb-4">
              {selectedIds.size} artigo(s) selecionado(s). Escolha as alterações a aplicar (deixe em branco para não alterar).
            </p>
            {batchState?.error && (
              <p className="text-red-400 text-sm mb-4">{batchState.error}</p>
            )}
            <form action={batchFormAction} className="space-y-4" {...batchFormBind}>
              <input
                type="hidden"
                name="item_ids"
                value={JSON.stringify(Array.from(selectedIds))}
              />
              <label className="block text-sm text-slate-300">
                Secção
                <select
                  name="section_id"
                  value={batchSectionId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setBatchSectionId(next);
                    if (
                      !next ||
                      !categories.some((c) => c.id === batchCategoryId && c.section_id === next)
                    ) {
                      setBatchCategoryId("");
                    }
                  }}
                  className="mt-1 block w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-200"
                >
                  <option value="">— Nenhuma —</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-slate-300">
                Categoria
                <select
                  name="category_id"
                  value={batchCategoryId}
                  onChange={(e) => setBatchCategoryId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-200"
                >
                  <option value="">— Nenhuma —</option>
                  {batchSectionId
                    ? categories
                        .filter((c) => c.section_id === batchSectionId)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))
                    : null}
                </select>
              </label>
              <label className="block text-sm text-slate-300">
                Tipo de artigo
                <select
                  name="batch_article_type_id"
                  className="mt-1 block w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-200"
                >
                  <option value="">— Não alterar —</option>
                  {articleTypes.map((at) => (
                    <option key={at.id} value={at.id}>{at.name}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm text-slate-300">
                  Visível no menu
                  <select name="batch_is_visible" className="mt-1 block w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-200">
                    <option value="">Não alterar</option>
                    <option value="1">Sim</option>
                    <option value="0">Não</option>
                  </select>
                </label>
                <label className="block text-sm text-slate-300">
                  Destaque
                  <select name="batch_is_featured" className="mt-1 block w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-200">
                    <option value="">Não alterar</option>
                    <option value="1">Sim</option>
                    <option value="0">Não</option>
                  </select>
                </label>
                <label className="block text-sm text-slate-300">
                  Take-away
                  <select name="batch_take_away" className="mt-1 block w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-200">
                    <option value="">Não alterar</option>
                    <option value="1">Sim</option>
                    <option value="0">Não</option>
                  </select>
                </label>
                <label className="block text-sm text-slate-300">
                  Em promoção
                  <select name="batch_is_promotion" className="mt-1 block w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-200">
                    <option value="">Não alterar</option>
                    <option value="1">Sim</option>
                    <option value="0">Não</option>
                  </select>
                </label>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setBatchModalOpen(false)}>
                  Cancelar
                </Button>
                <SubmitButton
                  variant="primary"
                  submitting={batchSubmitting}
                  loadingText="A aplicar…"
                >
                  Aplicar
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
