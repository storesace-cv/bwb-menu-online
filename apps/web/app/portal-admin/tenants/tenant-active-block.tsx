"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTenantActive } from "../actions";
import { Button, Alert } from "@/components/admin";

export function TenantActiveBlock({
  tenantId,
  initialIsActive,
}: {
  tenantId: string;
  initialIsActive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isActive, setIsActive] = useState(initialIsActive);
  const [result, setResult] = useState<{ error?: string } | null>(null);

  function handleToggle() {
    setResult(null);
    const newValue = !isActive;
    startTransition(async () => {
      const res = await setTenantActive(tenantId, newValue);
      setResult(res ?? null);
      if (!res?.error) {
        setIsActive(newValue);
        router.refresh();
      }
    });
  }

  return (
    <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
      <h3 className="text-sm font-medium text-slate-300 mb-2">Estado do tenant</h3>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
          }`}
        >
          {isActive ? "Activo" : "Desactivado"}
        </span>
        <Button
          type="button"
          variant={isActive ? "outline" : "primary"}
          onClick={handleToggle}
          disabled={isPending}
        >
          {isPending ? "A guardar…" : isActive ? "Desactivar" : "Activar"}
        </Button>
      </div>
      {!isActive && (
        <p className="text-xs text-slate-500 mt-2">
          Quando desactivado, o menu público mostra um vídeo e a mensagem &quot;MENU TEMPORÁRIAMENTE DESACTIVADO&quot;.
        </p>
      )}
      {result?.error && (
        <Alert variant="error" className="mt-2">
          {result.error}
        </Alert>
      )}
    </div>
  );
}
