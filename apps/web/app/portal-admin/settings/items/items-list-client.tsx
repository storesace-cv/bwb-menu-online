"use client";

import { useState, useMemo, useEffect } from "react";
import { useFormState } from "react-dom";
import { ItemActions } from "./item-actions";
import { MenuIcon } from "@/components/menu-icons";
import { BwbTable, Button } from "@/components/admin";
import type { ColumnDef } from "@/lib/admin/bwbTableSort";
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
  items,
  sections,
  categories,
  articleTypes,
  itemSectionCategory,
  itemFamilia,
}: {
  items: Item[];
  sections: Section[];
  categories: Category[];
  articleTypes: ArticleType[];
  itemSectionCategory: Record<string, { sectionName: string; categoryName: string }>;
  itemFamilia: Record<string, { familia: string | null; sub_familia: string | null }>;
}) {
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

  const typeById = useMemo(() => new Map(articleTypes.map((t) => [t.id, t])), [articleTypes]);

  const displayName = (i: Item) => i.menu_name ?? i.name_original ?? "";
  const displayPrice = (i: Item) => i.menu_price ?? i.resolved_price ?? null;

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (filterName.trim()) {
        const name = displayName(i).toLowerCase();
        if (!name.includes(filterName.trim().toLowerCase())) return false;
      }
      if (filterType && i.article_type_id !== filterType) return false;
      if (filterFamilia.trim()) {
        const familia = (itemFamilia[i.id]?.familia ?? "").toLowerCase();
        if (!familia.includes(filterFamilia.trim().toLowerCase())) return false;
      }
      if (filterSubFamilia.trim()) {
        const subFamilia = (itemFamilia[i.id]?.sub_familia ?? "").toLowerCase();
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
  }, [items, filterName, filterType, filterFamilia, filterSubFamilia, filterPromo, filterTA, filterVisible, filterFeatured, itemFamilia]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredItems.map((i) => i.id)));
  };

  const [batchState, batchFormAction] = useFormState(batchUpdateItemsSectionCategory, null);

  useEffect(() => {
    if (batchState?.success) {
      setBatchModalOpen(false);
      setSelectedIds(new Set());
      setBatchSectionId("");
      setBatchCategoryId("");
    }
  }, [batchState?.success]);

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
            checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
            onChange={toggleSelectAll}
            aria-label="Selecionar todos"
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
        render: (i) => (displayPrice(i) != null ? `${Number(displayPrice(i)).toFixed(2)} €` : "—"),
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
        key: "section",
        label: "Secção",
        type: "text",
        accessor: (i) => itemSectionCategory[i.id]?.sectionName ?? "",
        render: (i) => itemSectionCategory[i.id]?.sectionName ?? "—",
      },
      {
        key: "category",
        label: "Categoria",
        type: "text",
        accessor: (i) => itemSectionCategory[i.id]?.categoryName ?? "",
        render: (i) => itemSectionCategory[i.id]?.categoryName ?? "—",
      },
      {
        key: "actions",
        label: "Ações",
        type: "text",
        sortable: false,
        render: (i) => <ItemActions itemId={i.id} menuName={displayName(i)} />,
      },
    ],
    [filteredItems.length, selectedIds.size, typeById, itemSectionCategory, itemFamilia]
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

      <BwbTable<Item>
        columns={columns}
        rows={filteredItems}
        rowKey={(i) => i.id}
        defaultSort={[{ key: "name", direction: "asc", type: "text" }]}
      />
      {filteredItems.length === 0 && <p className="text-slate-500 py-4">Nenhum item.</p>}

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
