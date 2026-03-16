"use client";

import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/admin";

type Item = { id: string; menu_name: string };

function getWeekDates(): { date: string; label: string }[] {
  const out: { date: string; label: string }[] = [];
  const d = new Date();
  for (let i = 0; i < 7; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    const date = x.toISOString().slice(0, 10);
    const weekday = x.toLocaleDateString("pt-PT", { weekday: "short" }).replace(/^./, (c) => c.toUpperCase());
    const ddm = x.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
    out.push({ date, label: `${weekday} ${ddm}` });
  }
  return out;
}

export function DiariasScheduleClient({ items }: { items: Item[] }) {
  const weekDays = useMemo(() => getWeekDates(), []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scheduleByItem, setScheduleByItem] = useState<Record<string, Record<string, string>>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchModal, setSearchModal] = useState<{ itemId: string; date: string } | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; menu_name: string | null; display_name?: string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const loadSchedule = useCallback(async (menuItemId: string) => {
    setLoadingId(menuItemId);
    try {
      const res = await fetch(`/api/portal-admin/gestao-diaria/diarias/schedule?menuItemId=${encodeURIComponent(menuItemId)}`);
      if (!res.ok) return;
      const { schedule } = (await res.json()) as { schedule: Record<string, string> };
      setScheduleByItem((prev) => ({ ...prev, [menuItemId]: schedule ?? {} }));
    } finally {
      setLoadingId(null);
    }
  }, []);

  const saveSlot = useCallback(async (menuItemId: string, date: string, displayName: string) => {
    setSaving(`${menuItemId}:${date}`);
    try {
      const res = await fetch("/api/portal-admin/gestao-diaria/diarias/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_item_id: menuItemId, schedule_date: date, display_name: displayName }),
      });
      if (res.ok) {
        setScheduleByItem((prev) => ({
          ...prev,
          [menuItemId]: { ...(prev[menuItemId] ?? {}), [date]: displayName },
        }));
      }
    } finally {
      setSaving(null);
    }
  }, []);

  const handleExpand = (id: string) => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next && !scheduleByItem[next]) loadSchedule(next);
  };

  const handleBlur = (itemId: string, date: string, value: string) => {
    const current = scheduleByItem[itemId]?.[date] ?? "";
    if (value.trim() !== current) saveSlot(itemId, date, value.trim());
  };

  const openSearch = (itemId: string, date: string) => {
    setSearchModal({ itemId, date });
    setSearchQ("");
    setSearchResults([]);
  };

  const runSearch = useCallback(async () => {
    if (!searchModal) return;
    setSearchLoading(true);
    try {
      const res = await fetch(
        `/api/portal-admin/gestao-diaria/diarias/items-search?q=${encodeURIComponent(searchQ)}&limit=20`
      );
      if (!res.ok) return;
      const { items: list } = (await res.json()) as { items: { id: string; menu_name: string | null; display_name?: string }[] };
      setSearchResults(list ?? []);
    } finally {
      setSearchLoading(false);
    }
  }, [searchModal, searchQ]);

  const selectSearchItem = (displayName: string) => {
    if (!searchModal) return;
    const { itemId, date } = searchModal;
    setScheduleByItem((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? {}), [date]: displayName },
    }));
    saveSlot(itemId, date, displayName);
    setSearchModal(null);
  };

  if (items.length === 0) {
    return (
      <p className="text-slate-400">
        Não há artigos com &quot;Prato do Dia&quot; e &quot;Visível no menu&quot; activos. Active estas opções em Definições → Artigos.
      </p>
    );
  }

  return (
    <div className="space-y-3 max-w-4xl">
      {items.map((item) => {
        const isExpanded = expandedId === item.id;
        const schedule = scheduleByItem[item.id] ?? {};
        const loading = loadingId === item.id;

        return (
          <Card key={item.id} className="p-4 border border-slate-700 bg-slate-800/50">
            <button
              type="button"
              onClick={() => handleExpand(item.id)}
              className="w-full flex items-center justify-between text-left"
              aria-expanded={isExpanded}
            >
              <span className="font-medium text-slate-100">{item.menu_name}</span>
              <span className="text-slate-400 text-sm" aria-hidden>
                {isExpanded ? "▼" : "▶"}
              </span>
            </button>
            {isExpanded && (
              <div className="mt-4 space-y-3 border-t border-slate-600 pt-4">
                {loading ? (
                  <p className="text-slate-400 text-sm">A carregar...</p>
                ) : (
                  weekDays.map(({ date, label }) => (
                    <div key={date} className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-400 text-sm w-24 shrink-0">{label}</span>
                      <div className="flex-1 min-w-[200px] flex items-center gap-2">
                        <input
                          type="text"
                          className="flex-1 min-w-0 px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-200 placeholder-slate-500"
                          placeholder="Nome do artigo"
                          value={schedule[date] ?? ""}
                          onChange={(e) =>
                            setScheduleByItem((prev) => ({
                              ...prev,
                              [item.id]: { ...(prev[item.id] ?? {}), [date]: e.target.value },
                            }))
                          }
                          onBlur={() => saveSlot(item.id, date, (scheduleByItem[item.id] ?? {})[date] ?? "")}
                        />
                        <button
                          type="button"
                          onClick={() => openSearch(item.id, date)}
                          className="shrink-0 px-3 py-2 rounded border border-slate-600 bg-slate-700 text-slate-200 text-sm hover:bg-slate-600"
                        >
                          Inserir item
                        </button>
                      </div>
                      {saving === `${item.id}:${date}` && (
                        <span className="text-slate-500 text-xs">A guardar...</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        );
      })}

      {searchModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-modal-title"
        >
          <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
            <h2 id="search-modal-title" className="p-4 text-lg font-medium text-slate-100 border-b border-slate-600">
              Inserir artigo
            </h2>
            <div className="p-4 flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-200 placeholder-slate-500"
                placeholder="Pesquisar por nome..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
              />
              <button
                type="button"
                onClick={runSearch}
                disabled={searchLoading}
                className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {searchLoading ? "..." : "Pesquisar"}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 border-t border-slate-600">
              {searchResults.length === 0 && !searchLoading && (
                <p className="text-slate-400 text-sm">Use a pesquisa para listar artigos.</p>
              )}
              <ul className="space-y-1">
                {searchResults.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => selectSearchItem(r.display_name ?? r.menu_name ?? "")}
                      className="w-full text-left px-3 py-2 rounded hover:bg-slate-700 text-slate-200"
                    >
                      {r.display_name ?? r.menu_name ?? "(sem nome)"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 border-t border-slate-600">
              <button
                type="button"
                onClick={() => setSearchModal(null)}
                className="px-4 py-2 rounded border border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
