import Link from "next/link";
import { Card, Spinner } from "@/components/admin";

export default function SettingsItemsLoading() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Gestão de Artigos</h1>
      <p className="mb-6">
        <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300" prefetch={false}>← Definições</Link>
      </p>
      <Card>
        <div className="flex items-center gap-3 py-8 text-slate-300">
          <Spinner className="h-6 w-6 flex-shrink-0" />
          <span>A carregar Gestão de Artigos…</span>
        </div>
      </Card>
    </div>
  );
}
