"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStoreSourceType } from "../actions";
import { SOURCE_TYPE_EDIT_OPTIONS, getSourceTypeLabel } from "./source-type-options";

const SAVED_FEEDBACK_MS = 2500;

export function StoreSourceTypeCell({ storeId, sourceType }: { storeId: string; sourceType: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showSaved, setShowSaved] = useState(false);
  const hasCurrentInList = SOURCE_TYPE_EDIT_OPTIONS.some((o) => o.value === sourceType);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setShowSaved(false);
    if (newValue === sourceType) return;
    startTransition(async () => {
      const result = await updateStoreSourceType(storeId, newValue);
      if (result?.error) alert(result.error);
      else {
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), SAVED_FEEDBACK_MS);
        router.refresh();
      }
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      <select
        value={sourceType}
        onChange={handleChange}
        disabled={isPending}
        className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
        aria-label="Origem dos Dados"
      >
        {!hasCurrentInList && (
          <option value={sourceType}>{getSourceTypeLabel(sourceType)}</option>
        )}
        {SOURCE_TYPE_EDIT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {showSaved && (
        <span className="text-xs text-emerald-400 whitespace-nowrap" role="status">
          Guardado
        </span>
      )}
    </span>
  );
}
