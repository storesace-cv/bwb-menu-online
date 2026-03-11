"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTenantSourceType } from "../actions";
import { SOURCE_TYPE_EDIT_OPTIONS, getSourceTypeLabel } from "./source-type-options";
import { Alert } from "@/components/admin";

export function TenantSourceTypeBlock({
  tenantId,
  initialSourceType,
}: {
  tenantId: string;
  initialSourceType: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(initialSourceType || "netbo_api");
  const [result, setResult] = useState<{ error?: string } | null>(null);
  const hasCurrentInList = SOURCE_TYPE_EDIT_OPTIONS.some((o) => o.value === value);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newValue = e.target.value;
    setValue(newValue);
    setResult(null);
    startTransition(async () => {
      const res = await updateTenantSourceType(tenantId, newValue);
      setResult(res ?? null);
      if (!res?.error) router.refresh();
    });
  }

  return (
    <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
      <h3 className="text-sm font-medium text-slate-300 mb-2">Origem dos Dados</h3>
      <p className="text-xs text-slate-500 mb-2">Definida aqui; o cliente não pode alterar. As lojas herdam este valor.</p>
      <select
        value={value}
        onChange={handleChange}
        disabled={isPending}
        className="rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 max-w-md"
        aria-label="Origem dos Dados"
      >
        {!hasCurrentInList && (
          <option value={value}>{getSourceTypeLabel(value)}</option>
        )}
        {SOURCE_TYPE_EDIT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {result?.error && (
        <Alert variant="error" className="mt-2">
          {result.error}
        </Alert>
      )}
    </div>
  );
}
