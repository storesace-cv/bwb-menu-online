import { Card, Spinner } from "@/components/admin";

export default function SettingsLoading() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Definições</h1>
      <p className="mb-6 text-slate-400">A carregar…</p>
      <Card>
        <div className="flex items-center gap-3 py-8 text-slate-300">
          <Spinner className="h-6 w-6 flex-shrink-0" />
          <span>A carregar…</span>
        </div>
      </Card>
    </div>
  );
}
