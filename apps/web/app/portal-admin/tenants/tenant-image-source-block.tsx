"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTenantImageSource } from "../actions";
import { Button, Alert } from "@/components/admin";

const IMAGE_SOURCE_OPTIONS = [
  { value: "storage", label: "Supabase Storage (upload por código)" },
  { value: "url", label: "URL por artigo (image_url)" },
  { value: "legacy_path", label: "Path legado (image_path)" },
] as const;

export function TenantImageSourceBlock({
  tenantId,
  initialImageSource,
}: {
  tenantId: string;
  initialImageSource: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(initialImageSource || "storage");
  const [result, setResult] = useState<{ error?: string } | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newValue = e.target.value;
    setValue(newValue);
    setResult(null);
    startTransition(async () => {
      const res = await updateTenantImageSource(tenantId, newValue);
      setResult(res ?? null);
      if (!res?.error) router.refresh();
    });
  }

  return (
    <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
      <h3 className="text-sm font-medium text-slate-300 mb-2">Modo de utilização das fotos dos artigos</h3>
      <p className="text-xs text-slate-500 mb-2">Definido aqui; o cliente não pode alterar.</p>
      <select
        value={value}
        onChange={handleChange}
        disabled={isPending}
        className="rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 max-w-md"
        aria-label="Modo de leitura de imagens"
      >
        {IMAGE_SOURCE_OPTIONS.map((opt) => (
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
