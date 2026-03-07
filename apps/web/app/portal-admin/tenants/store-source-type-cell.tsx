"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStoreSourceType } from "../actions";
import { SOURCE_TYPE_EDIT_OPTIONS, getSourceTypeLabel } from "./source-type-options";

export function StoreSourceTypeCell({ storeId, sourceType }: { storeId: string; sourceType: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hasCurrentInList = SOURCE_TYPE_EDIT_OPTIONS.some((o) => o.value === sourceType);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    if (newValue === sourceType) return;
    startTransition(async () => {
      const result = await updateStoreSourceType(storeId, newValue);
      if (result?.error) alert(result.error);
      else router.refresh();
    });
  };

  return (
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
  );
}
