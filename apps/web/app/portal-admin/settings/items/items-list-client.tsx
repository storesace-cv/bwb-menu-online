"use client";

import { useState, useMemo, useEffect } from "react";
import { useFormState } from "react-dom";
import { ItemActions } from "./item-actions";
import { MenuIcon } from "@/components/menu-icons";
import { TableContainer, Button } from "@/components/admin";
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

type SortKey = "name" | "price" | "type" | "promo" | "ta" | "prep" | "section" | "category" | "familia" | "sub_familia";

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
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
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

  const sortedItems = useMemo(() => {
    const arr = [...filteredItems];
    arr.sort((a, b) => {
      let cmp = 0;
      const atA = a.article_type_id ? typeById.get(a.article_type_id)?.name ?? "" : "";
      const atB = b.article_type_id ? typeById.get(b.article_type_id)?.name ?? "" : "";
      switch (sortBy) {
        case "name":
          cmp = displayName(a).localeCompare(displayName(b));
          break;
        case "price":
          cmp = (displayPrice(a) ?? 0) - (displayPrice(b) ?? 0);
          break;
        case "type":
          cmp = atA.localeCompare(atB);
          break;
        case "promo":
          cmp = (a.is_promotion ? 1 : 0) - (b.is_promotion ? 1 : 0);
          break;
        case "ta":
          cmp = (a.take_away ? 1 : 0) - (b.take_away ? 1 : 0);
          break;
        case "prep":
          cmp = (a.prep_minutes ?? -1) - (b.prep_minutes ?? -1);
          break;
        case "section":
          cmp = (itemSectionCategory[a.id]?.sectionName ?? "").localeCompare(itemSectionCategory[b.id]?.sectionName ?? "");
          break;
        case "category":
          cmp = (itemSectionCategory[a.id]?.categoryName ?? "").localeCompare(itemSectionCategory[b.id]?.categoryName ?? "");
          break;
        case "familia":
          cmp = (itemFamilia[a.id]?.familia ?? "").localeCompare(itemFamilia[b.id]?.familia ?? "");
          break;
        case "sub_familia":
          cmp = (itemFamilia[a.id]?.sub_familia ?? "").localeCompare(itemFamilia[b.id]?.sub_familia ?? "");
          break;
        default:
          break;
      }
      if (cmp === 0) cmp = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (cmp === 0) cmp = a.id.localeCompare(b.id);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filteredItems, sortBy, sortDir, typeById, itemSectionCategory, itemFamilia]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedItems.map((i) => i.id)));
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

      <TableContainer>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-600">
              <th className="text-left py-2 px-3 text-slate-300 w-10">
                <input
                  type="checkbox"
                  checked={sortedItems.length > 0 && selectedIds.size === sortedItems.length}
                  onChange={toggleSelectAll}
                  aria-label="Selecionar todos"
                />
              </th>
              <th className="text-left py-2 px-3 text-slate-300">
                <button type="button" onClick={() => toggleSort("name")} className="text-left font-medium text-slate-300 hover:text-slate-100">
                  Nome {sortBy === "name" && (sortDir === "asc" ? "↑" : "↓")}
                </button>
              </th>
              <th className="text-left py-2 px-3 text-slate-300">
                <button type="button" onClick={() => toggleSort("price")} className="text-left font-medium text-slate-300 hover:text-slate-100">
                  Preço {sortBy === "price" && (sortDir === "asc" ? "↑" : "↓")}
                </button>
              </th>
              <th className="text-left py-2 px-3 text-slate-300">
                <button type="button" onClick={() => toggleSort("type")} className="text-left font-medium text-slate-300 hover:text-slate-100">
                  Tipo {sortBy === "type" && (sortDir === "asc" ? "↑" : "↓")}
                </button>
              </th>
              <th className="text-left py-2 px-3 text-slate-300">
                <button type="button" onClick={() => toggleSort("familia")} className="text-left font-medium text-slate-300 hover:text-slate-100">
                  Familia {sortBy === "familia" && (sortDir === "asc" ? "↑" : "↓")}
                </button>
              </th>
              <th className="text-left py-2 px-3 text-slate-300">
                <button type="button" onClick={() => toggleSort("sub_familia")} className="text-left font-medium text-slate-300 hover:text-slate-100">
                  Sub Familia {sortBy === "sub_familia" && (sortDir === "asc" ? "↑" : "↓")}
                </button>
              </th>
              <th className="text-left py-2 px-3 text-slate-300">
                <button type="button" onClick={() => toggleSort("promo")} className="text-left font-medium text-slate-300 hover:text-slate-100">
                  Promo {sortBy === "promo" && (sortDir === "asc" ? "↑" : "↓")}
                </button>
              </th>
              <th className="text-left py-2 px-3 text-slate-300">
                <button type="button" onClick={() => toggleSort("ta")} className="text-left font-medium text-slate-300 hover:text-slate-100">
                  TA {sortBy === "ta" && (sortDir === "asc" ? "↑" : "↓")}
                </button>
              </th>
              <th className="text-left py-2 px-3 text-slate-300">
                <button type="button" onClick={() => toggleSort("prep")} className="text-left font-medium text-slate-300 hover:text-slate-100">
                  Tempo prep. {sortBy === "prep" && (sortDir === "asc" ? "↑" : "↓")}
                </button>
              </th>
              <th className="text-left py-2 px-3 text-slate-300">Ordem</th>
              <th className="text-left py-2 px-3 text-slate-300">Visível</th>
              <th className="text-left py-2 px-3 text-slate-300">Destaque</th>
              <th className="text-left py-2 px-3 text-slate-300">
                <button type="button" onClick={() => toggleSort("section")} className="text-left font-medium text-slate-300 hover:text-slate-100">
                  Secção {sortBy === "section" && (sortDir === "asc" ? "↑" : "↓")}
                </button>
              </th>
              <th className="text-left py-2 px-3 text-slate-300">
                <button type="button" onClick={() => toggleSort("category")} className="text-left font-medium text-slate-300 hover:text-slate-100">
                  Categoria {sortBy === "category" && (sortDir === "asc" ? "↑" : "↓")}
                </button>
              </th>
              <th className="text-left py-2 px-3 text-slate-300">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((i) => {
              const at = i.article_type_id ? typeById.get(i.article_type_id) : null;
              const sc = itemSectionCategory[i.id];
              return (
                <tr key={i.id} className="border-b border-slate-700">
                  <td className="py-2 px-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(i.id)}
                      onChange={() => toggleSelect(i.id)}
                      aria-label={`Selecionar ${displayName(i) || i.id}`}
                    />
                  </td>
                  <td className="py-2 px-3 text-slate-200">{displayName(i) || "—"}</td>
                  <td className="py-2 px-3 text-slate-200">{displayPrice(i) != null ? `${Number(displayPrice(i)).toFixed(2)} €` : "—"}</td>
                  <td className="py-2 px-3">{at ? <span title={at.name}><MenuIcon code={at.icon_code} size={18} /></span> : "—"}</td>
                  <td className="py-2 px-3 text-slate-200">{itemFamilia[i.id]?.familia ?? "—"}</td>
                  <td className="py-2 px-3 text-slate-200">{itemFamilia[i.id]?.sub_familia ?? "—"}</td>
                  <td className="py-2 px-3 text-slate-200">{i.is_promotion ? (i.price_old != null ? `${i.price_old}→` : "Sim") : "—"}</td>
                  <td className="py-2 px-3 text-slate-200">{i.take_away ? "Sim" : "—"}</td>
                  <td className="py-2 px-3 text-slate-200">{i.prep_minutes != null ? `${i.prep_minutes}'` : "—"}</td>
                  <td className="py-2 px-3 text-slate-200">{i.sort_order}</td>
                  <td className="py-2 px-3 text-slate-200">{i.is_visible ? "Sim" : "Não"}</td>
                  <td className="py-2 px-3 text-slate-200">{i.is_featured ? "★" : "—"}</td>
                  <td className="py-2 px-3 text-slate-200">{sc?.sectionName ?? "—"}</td>
                  <td className="py-2 px-3 text-slate-200">{sc?.categoryName ?? "—"}</td>
                  <td className="py-2 px-3">
                    <ItemActions itemId={i.id} menuName={displayName(i)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableContainer>
      {sortedItems.length === 0 && <p className="text-slate-500 py-4">Nenhum item.</p>}

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
                  onChange={(e) => setBatchSectionId(e.target.value)}
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
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
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
