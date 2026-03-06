"use client";

import { useState, useRef, useEffect } from "react";

export type MultiSelectOption = { id: string; label: string };

export function MultiSelectDropdown({
  label,
  name,
  options,
  selectedIds,
  placeholder = "Todas",
}: {
  label: string;
  name: string;
  options: MultiSelectOption[];
  selectedIds: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCount = selectedIds.length;
  const buttonLabel =
    selectedCount === 0 ? placeholder : selectedCount === 1 ? "1 selecionada" : `${selectedCount} selecionadas`;

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-1">
        <span className="block text-sm font-medium text-slate-300">{label}</span>
      </div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full min-w-[12rem] rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200 text-left flex items-center justify-between gap-2 hover:border-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{buttonLabel}</span>
        <span className="text-slate-500" aria-hidden="true">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {/* Panel always in DOM so checkboxes submit with form when dropdown is closed */}
      <div
        className={`absolute top-full left-0 mt-1 z-20 min-w-[14rem] max-h-60 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-xl py-2 ${open ? "" : "invisible opacity-0 pointer-events-none"}`}
        role="listbox"
        aria-hidden={!open}
      >
        {options.length === 0 ? (
          <p className="px-3 py-2 text-slate-500 text-sm">Nenhuma opção</p>
        ) : (
          <ul className="list-none p-0 m-0">
            {options.map((opt) => (
              <li key={opt.id} role="option">
                <label className="flex items-center gap-2 px-3 py-1.5 text-slate-200 text-sm cursor-pointer hover:bg-slate-700/50">
                  <input
                    type="checkbox"
                    name={name}
                    value={opt.id}
                    defaultChecked={selectedIds.includes(opt.id)}
                    className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
                  />
                  {opt.label}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
