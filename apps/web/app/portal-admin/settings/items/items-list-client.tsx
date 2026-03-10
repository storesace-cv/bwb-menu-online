"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { ItemActions } from "./item-actions";
import { MenuIcon } from "@/components/menu-icons";
import { BwbTable, Button } from "@/components/admin";
import type { ColumnDef, SortRule } from "@/lib/admin/bwbTableSort";

const ITEMS_SORT_STORAGE_KEY = "bwb-portal-settings-items-sort";
const ITEMS_PER_PAGE_STORAGE_KEY = "bwb-portal-settings-items-per-page";
const DEFAULT_ITEMS_SORT: SortRule[] = [{ key: "name", direction: "asc", type: "text" }];
const SORTABLE_COLUMN_KEYS = new Set(["name", "price", "type", "familia", "sub_familia", "promo", "ta", "prep", "sort_order", "is_visible", "is_featured", "section", "category"]);
const PER_PAGE_OPTIONS = [25, 50, 100, 250] as const;
import { batchUpdateItemsSectionCategory } from "../../actions";

type Section = { id: string; name: string; sort_order: number | null };
type Category = { id: string; name: string; section_id: string | null; sort_order: number | null };
type ArticleType = { id: string; name: string; icon_code: string };
type Item = {
  id: string;
  menu_name: string | null;
  menu_description: string | null;
  menu_price: number | null;
  name_original?: string | null;
  resolved_price?: number | null;
  is_visible: boolean;
  is_featured: boolean;
  sort_order: number | null;
  is_promotion: boolean;
  price_old: number | null;
  take_away: boolean;
  article_type_id: string | null;
  prep_minutes: number | null;
};

export function ItemsListClient({
  items: initialItems,
  totalCount,
  hasMore,
  sections,
  categories,
  articleTypes,
  itemSectionCategory: initialItemSectionCategory,
  itemFamilia: initialItemFamilia,
  currencyCode = "€",
}: {
  items: Item[];
  totalCount: number;
  hasMore: boolean;
  sections: Section[];
  categories: Category[];
  articleTypes: ArticleType[];
  itemSectionCategory: Record<string, { sectionName: string; categoryName: string }>;
  itemFamilia: Record<string, { familia: string | null; sub_familia: string | null }>;
  currencyCode?: string;
}) {
  const [mergedItems, setMergedItems] = useState<Item[]>(initialItems);
  const [mergedSectionCategory, setMergedSectionCategory] = useState<Record<string, { sectionName: string; categoryName: string }>>(initialItemSectionCategory);
  const [mergedFamilia, setMergedFamilia] = useState<Record<string, { familia: string | null; sub_familia: string | null }>>(initialItemFamilia);
  const [restLoading, setRestLoading] = useState(false);
  const restLoadStarted = useRef(false);

  const [perPage, setPerPage] = useState<number | "all">(50);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (initialItems.length > 0) {
      setMergedItems(initialItems);
      setMergedSectionCategory(initialItemSectionCategory);
      setMergedFamilia(initialItemFamilia);
    }
  }, [initialItems, initialItemSectionCategory, initialItemFamilia]);

  const backfillSectionCategoryStarted = useRef(false);
  useEffect(() => {
    if (backfillSectionCategoryStarted.current || initialItems.length === 0) return;
    const withDash = initialItems.filter((i) => (initialItemSectionCategory[i.id]?.sectionName ?? "—") === "—").length;
    if (withDash <= initialItems.length / 2) return;
    backfillSectionCategoryStarted.current = true;
    fetch(`/api/portal-admin/settings/items?offset=0&limit=${initialItems.length}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data: { items: Item[]; itemSectionCategory: Record<string, { sectionName: string; categoryName: string }>; itemFamilia: Record<string, { familia: string | null; sub_familia: string | null }> }) => {
        if (data.itemSectionCategory && Object.keys(data.itemSectionCategory).length > 0) {
          setMergedSectionCategory((prev) => ({ ...prev, ...data.itemSectionCategory }));
        }
        if (data.itemFamilia && Object.keys(data.itemFamilia).length > 0) {
          setMergedFamilia((prev) => ({ ...prev, ...data.itemFamilia }));
        }
      })
      .catch(() => {
        backfillSectionCategoryStarted.current = false;
      });
  }, [initialItems.length, initialItemSectionCategory]);

  useEffect(() => {
    if (!hasMore || restLoadStarted.current || initialItems.length === 0) return;
    restLoadStarted.current = true;
    setRestLoading(true);
    const offset = initialItems.length;
    fetch(`/api/portal-admin/settings/items?offset=${offset}&limit=5000`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data: { items: Item[]; itemSectionCategory: Record<string, { sectionName: string; categoryName: string }>; itemFamilia: Record<string, { familia: string | null; sub_familia: string | null }> }) => {
        setMergedItems((prev) => [...prev, ...(data.items ?? [])]);
        setMergedSectionCategory((prev) => ({ ...prev, ...(data.itemSectionCategory ?? {}) }));
        setMergedFamilia((prev) => ({ ...prev, ...(data.itemFamilia ?? {}) }));
      })
      .catch(() => {
        restLoadStarted.current = false;
      })
      .finally(() => {
        setRestLoading(false);
      });
  }, [hasMore, initialItems.length]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchSectionId, setBatchSectionId] = useState("");
  const [batchCategoryId, setBatchCategoryId] = useState("");

  const [filterName, setFilterName] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFamilia, setFilterFamilia] = useState("");
  const [filterSubFamilia, setFilterSubFamilia] = useState("");
  const [filterPromo, setFilterPromo] = useState("");
  const [filterTA, setFilterTA] = useState("");
  const [filterVisible, setFilterVisible] = useState("");
  const [filterFeatured, setFilterFeatured] = useState("");

  const [sortRules, setSortRules] = useState<SortRule[]>(DEFAULT_ITEMS_SORT);

  useEffect(() => {
    try {
      const rawPerPage = localStorage.getItem(ITEMS_PER_PAGE_STORAGE_KEY);
      if (rawPerPage === "all") setPerPage("all");
      else {
        const n = parseInt(rawPerPage ?? "", 10);
        if (PER_PAGE_OPTIONS.includes(n as (typeof PER_PAGE_OPTIONS)[number])) setPerPage(n);
      }
      const rawSort = localStorage.getItem(ITEMS_SORT_STORAGE_KEY);
      if (rawSort) {
        const parsed = JSON.parse(rawSort) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(
            (r): r is SortRule =>
              r != null &&
              typeof r === "object" &&
              typeof (r as SortRule).key === "string" &&
              ((r as SortRule).direction === "asc" || (r as SortRule).direction === "desc") &&
              SORTABLE_COLUMN_KEYS.has((r as SortRule).key)
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
      localStorage.setItem(ITEMS_SORT_STORAGE_KEY, JSON.stringify(rules));
    } catch {
      /* ignore */
    }
  };

  const typeById = useMemo(() => new Map(articleTypes.map((t) => [t.id, t])), [articleTypes]);

  const displayName = (i: Item) => i.menu_name ?? i.name_original ?? "";
  const displayPrice = (i: Item) => i.menu_price ?? i.resolved_price ?? null;

  const filteredItems = useMemo(() => {
    return mergedItems.filter((i) => {
      if (filterName.trim()) {
        const name = displayName(i).toLowerCase();
        if (!name.includes(filterName.trim().toLowerCase())) return false;
      }
      if (filterType && i.article_type_id !== filterType) return false;
      if (filterFamilia.trim()) {
        const familia = (mergedFamilia[i.id]?.familia ?? "").toLowerCase();
        if (!familia.includes(filterFamilia.trim().toLowerCase())) return false;
      }
      if (filterSubFamilia.trim()) {
        const subFamilia = (mergedFamilia[i.id]?.sub_familia ?? "").toLowerCase();
        if (!subFamilia.includes(filterSubFamilia.trim().toLowerCase())) return false;
      }
      if (filterPromo === "sim" && !i.is_promotion) return false;
      if (filterPromo === "nao" && i.is_promotion) return false;
      if (filterTA === "sim" && !i.take_away) return false;
      if (filterTA === "nao" && i.take_away) return false;
      if (filterVisible === "sim" && !i.is_visible) return false;
      if (filterVisible === "nao" && i.is_visible) return false;
      if (filterFeatured === "sim" && !i.is_featured) return false;
      if (filterFeatured === "nao" && i.is_featured) return false;
      return true;
    });
  }, [mergedItems, filterName, filterType, filterFamilia, filterSubFamilia, filterPromo, filterTA, filterVisible, filterFeatured, mergedFamilia]);

  const perPageNum = perPage === "all" ? 999999 : perPage;
  const totalFiltered = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / perPageNum));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * perPageNum;
  const paginatedRows = useMemo(
    () => filteredItems.slice(startIdx, startIdx + perPageNum),
    [filteredItems, startIdx, perPageNum]
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

  const allOnPageSelected = paginatedRows.length > 0 && paginatedRows.every((i) => selectedIds.has(i.id));
  const toggleSelectAll = () => {
    if (allOnPageSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginatedRows.map((i) => i.id)));
  };

  const handlePerPageChange = (value: number | "all") => {
    setPerPage(value);
    setCurrentPage(1);
    try {
      localStorage.setItem(ITEMS_PER_PAGE_STORAGE_KEY, value === "all" ? "all" : String(value));
    } catch {
      /* ignore */
    }
  };

  const router = useRouter();
  const [batchState, batchFormAction] = useFormState(batchUpdateItemsSectionCategory, null);

  useEffect(() => {
    if (batchState?.success) {
      setBatchModalOpen(false);
      setSelectedIds(new Set());
      setBatchSectionId("");
      setBatchCategoryId("");
      router.refresh();
    }
  }, [batchState?.success, router]);

  const columns: ColumnDef<Item>[] = useMemo(
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
            aria-label={`Selecionar ${displayName(i) || i.id}`}
          />
        ),
      },
      {
        key: "name",
        label: "Nome",
        type: "text",
        accessor: (i) => displayName(i),
        render: (i) => displayName(i) || "—",
      },
      {
        key: "price",
        label: "Preço",
        type: "number",
        accessor: (i) => displayPrice(i),
        render: (i) => (displayPrice(i) != null ? `${Number(displayPrice(i)).toFixed(2)} ${currencyCode}` : "—"),
      },
      {
        key: "type",
        label: "Tipo",
        type: "text",
        accessor: (i) => (i.article_type_id ? typeById.get(i.article_type_id)?.name ?? "" : ""),
        render: (i) => {
          const at = i.article_type_id ? typeById.get(i.article_type_id) : null;
          return at ? <span title={at.name}><MenuIcon code={at.icon_code} size={18} /></span> : "—";
        },
      },
      {
        key: "familia",
        label: "Familia",
        type: "text",
        accessor: (i) => mergedFamilia[i.id]?.familia ?? "",
        render: (i) => mergedFamilia[i.id]?.familia ?? "—",
      },
      {
        key: "sub_familia",
        label: "Sub Familia",
        type: "text",
        accessor: (i) => mergedFamilia[i.id]?.sub_familia ?? "",
        render: (i) => mergedFamilia[i.id]?.sub_familia ?? "—",
      },
      {
        key: "section",
        label: "Secção",
        type: "text",
        accessor: (i) => mergedSectionCategory[i.id]?.sectionName ?? "",
        render: (i) => mergedSectionCategory[i.id]?.sectionName ?? "—",
      },
      {
        key: "category",
        label: "Categoria",
        type: "text",
        accessor: (i) => mergedSectionCategory[i.id]?.categoryName ?? "",
        render: (i) => mergedSectionCategory[i.id]?.categoryName ?? "—",
      },
      {
        key: "promo",
        label: "Promo",
        type: "text",
        accessor: (i) => (i.is_promotion ? "1" : "0"),
        render: (i) => (i.is_promotion ? (i.price_old != null ? `${i.price_old}→` : "Sim") : "—"),
      },
      {
        key: "ta",
        label: "TA",
        type: "text",
        accessor: (i) => (i.take_away ? "Sim" : "Não"),
        render: (i) => (i.take_away ? "Sim" : "—"),
      },
      {
        key: "prep",
        label: "Tempo prep.",
        type: "number",
        accessor: (i) => i.prep_minutes,
        render: (i) => (i.prep_minutes != null ? `${i.prep_minutes}'` : "—"),
      },
      {
        key: "sort_order",
        label: "Ordem",
        type: "number",
        accessor: (i) => i.sort_order,
        render: (i) => i.sort_order,
      },
      {
        key: "is_visible",
        label: "Visível",
        type: "text",
        accessor: (i) => (i.is_visible ? "Sim" : "Não"),
        render: (i) => (i.is_visible ? "Sim" : "Não"),
      },
      {
        key: "is_featured",
        label: "Destaque",
        type: "text",
        accessor: (i) => (i.is_featured ? "★" : ""),
        render: (i) => (i.is_featured ? "★" : "—"),
      },
      {
        key: "actions",
        label: "Ações",
        type: "text",
        sortable: false,
        render: (i) => <ItemActions itemId={i.id} menuName={displayName(i)} />,
      },
    ],
    [allOnPageSelected, typeById, mergedSectionCategory, mergedFamilia, currencyCode, selectedIds]
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-medium text-slate-200 m-0">Lista</h2>
        <Button
          type="button"
          variant="outline"
          onClick={() => setBatchModalOpen(true)}
          disabled={selectedIds.size === 0}
        >
          Alteração em Lote
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-600">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Nome
          <input
            type="text"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder="Filtrar por nome"
            className="px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-200 w-40"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Tipo
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-200"
          >
            <option value="">Todos</option>
            {articleTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Familia
          <input
            type="text"
            value={filterFamilia}
            onChange={(e) => setFilterFamilia(e.target.value)}
            placeholder="Filtrar por família"
            className="px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-200 w-40"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Sub Familia
          <input
            type="text"
            value={filterSubFamilia}
            onChange={(e) => setFilterSubFamilia(e.target.value)}
            placeholder="Filtrar por sub família"
            className="px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-200 w-40"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Promo
          <select
            value={filterPromo}
            onChange={(e) => setFilterPromo(e.target.value)}
            className="px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-200"
          >
            <option value="">Todos</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          TA
          <select
            value={filterTA}
            onChange={(e) => setFilterTA(e.target.value)}
            className="px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-200"
          >
            <option value="">Todos</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Visível
          <select
            value={filterVisible}
            onChange={(e) => setFilterVisible(e.target.value)}
            className="px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-200"
          >
            <option value="">Todos</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Destaque
          <select
            value={filterFeatured}
            onChange={(e) => setFilterFeatured(e.target.value)}
            className="px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-200"
          >
            <option value="">Todos</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </label>
      </div>

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
                <option key={n} value={n}>{n}</option>
              ))}
              <option value="all">Todos</option>
            </select>
          </label>
          <span>
            A mostrar {totalFiltered === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + perPageNum, totalFiltered)} de {totalFiltered}
            {restLoading && " (a carregar…)"}
            {!restLoading && hasMore && mergedItems.length < totalCount && totalCount > initialItems.length && " (carregado)"}
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

      <BwbTable<Item>
        columns={columns}
        rows={paginatedRows}
        rowKey={(i) => i.id}
        sortRules={sortRules}
        onSortChange={handleSortChange}
      />
      {paginatedRows.length === 0 && !restLoading && <p className="text-slate-500 py-4">Nenhum item.</p>}
      {paginatedRows.length === 0 && restLoading && <p className="text-slate-500 py-4">A carregar artigos…</p>}

      {/* Janela Alteração em Lote */}
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
            <form action={batchFormAction} className="space-y-4">
              <input type="hidden" name="item_ids" value={JSON.stringify(Array.from(selectedIds))} />
              <label className="block text-sm text-slate-300">
                Secção
                <select
                  name="section_id"
                  value={batchSectionId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setBatchSectionId(next);
                    if (!next || !categories.some((c) => c.id === batchCategoryId && c.section_id === next)) {
                      setBatchCategoryId("");
                    }
                  }}
                  className="mt-1 block w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-200"
                >
                  <option value="">— Nenhuma —</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
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
                    ? categories.filter((c) => c.section_id === batchSectionId).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
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
                <Button type="submit">Aplicar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
