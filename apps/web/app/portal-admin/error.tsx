"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PortalAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[portal-admin]", error);
  }, [error]);

  return (
    <div className="admin-theme min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-slate-800/80 border border-slate-700 p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-slate-100 mb-2">Algo correu mal</h1>
        <p className="text-slate-400 text-sm mb-6">
          Ocorreu um erro ao carregar esta página. Pode tentar de novo ou voltar ao início.
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
            href="/portal-admin"
            className="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700 text-sm"
          >
            Ir para o Portal Admin
          </Link>
          <Link
            href="/portal-admin/login"
            className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
