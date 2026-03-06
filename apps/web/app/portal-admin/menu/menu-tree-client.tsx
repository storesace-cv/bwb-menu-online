"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/admin";

export type MenuItemRow = { id: string; menu_name: string; menu_price: number | null; is_featured: boolean };
export type CategoryNode = { categoryId: string; categoryName: string; items: MenuItemRow[] };
export type SectionNode = { sectionKey: string; sectionName: string; categories: CategoryNode[] };

export function MenuTreeClient({
  tree,
  defaultExpanded = true,
}: {
  tree: SectionNode[];
  defaultExpanded?: boolean;
}) {
  const allSectionKeys = useMemo(() => tree.map((t) => t.sectionKey), [tree]);
  const allCategoryIds = useMemo(
    () => tree.flatMap((t) => t.categories.map((c) => c.categoryId)),
    [tree]
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() =>
    defaultExpanded ? new Set(allSectionKeys) : new Set()
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() =>
    defaultExpanded ? new Set(allCategoryIds) : new Set()
  );

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(allSectionKeys));
    setExpandedCategories(new Set(allCategoryIds));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
    setExpandedCategories(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={expandAll}
          className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700 text-sm"
          aria-label="Expandir tudo"
        >
          Expandir tudo
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700 text-sm"
          aria-label="Colapsar tudo"
        >
          Colapsar tudo
        </button>
      </div>
      {tree.map(({ sectionKey, sectionName, categories }) => {
        const isSectionExpanded = expandedSections.has(sectionKey);
        return (
          <Card key={sectionKey} className="overflow-hidden bg-slate-800 border-slate-700">
            <button
              type="button"
              onClick={() => toggleSection(sectionKey)}
              className="w-full flex items-center gap-2 text-left py-3 px-4 bg-slate-800 hover:bg-slate-700 border-b border-slate-600"
              aria-expanded={isSectionExpanded}
            >
              <span className="text-slate-400 text-lg leading-none w-6">
                {isSectionExpanded ? "▼" : "▶"}
              </span>
              <span className="text-lg font-bold text-slate-100">{sectionName}</span>
            </button>
            {isSectionExpanded && (
              <div className="p-4 pt-2 bg-slate-800">
                {categories.map(({ categoryId, categoryName, items }) => {
                  const isCatExpanded = expandedCategories.has(categoryId);
                  return (
                    <div key={categoryId} className="mb-4 last:mb-0">
                      <button
                        type="button"
                        onClick={() => toggleCategory(categoryId)}
                        className="flex items-center gap-2 text-left py-2 pl-4 ml-2 border-l-2 border-slate-600 hover:border-emerald-500/50 text-slate-200"
                        aria-expanded={isCatExpanded}
                      >
                        <span className="text-slate-400 text-sm w-4">
                          {isCatExpanded ? "▼" : "▶"}
                        </span>
                        <span className="text-base italic text-slate-200">{categoryName}</span>
                        <span className="text-slate-400 text-sm">({items.length} itens)</span>
                      </button>
                      {isCatExpanded && (
                        <ul className="list-none pl-0 mt-2 ml-8 space-y-1">
                          {items.map((item) => (
                            <li
                              key={item.id}
                              className="py-1.5 pl-2 text-slate-200 border-l border-slate-600/50"
                            >
                              {item.menu_name}
                              {item.menu_price != null && (
                                <span className="ml-2 text-slate-500">
                                  {Number(item.menu_price).toFixed(2)} €
                                </span>
                              )}
                              {item.is_featured && <span className="ml-2 text-amber-400">★</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
