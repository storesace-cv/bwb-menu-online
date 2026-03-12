"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PresentationTemplatesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[presentation-templates]", error);
  }, [error]);

  return (
    <div className="admin-theme min-h-[50vh] flex flex-col justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-slate-800/80 border border-slate-700 p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-slate-100 mb-2">Erro ao carregar Modelos de apresentação</h1>
        <p className="text-slate-400 text-sm mb-6">
          Ocorreu um erro ao carregar esta página. Pode tentar de novo ou voltar às Definições.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm"
          >
            Tentar de novo
          </button>
          <Link
            href="/portal-admin/settings"
            className="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700 text-sm"
            prefetch={false}
          >
            ← Definições
          </Link>
        </div>
      </div>
    </div>
  );
}
