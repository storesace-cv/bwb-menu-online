import Link from "next/link";
import { Card } from "@/components/admin";

const CARDS = [
  {
    href: "/portal-admin/sync",
    label: "Sync",
    description: "Sincronizar catálogo e ver histórico de sync.",
  },
] as const;

export default function GestaoDiariaPage() {
  return (
    <div>
      <nav className="mb-2 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li>
            <Link href="/portal-admin" className="hover:text-slate-200 transition-colors">
              Portal Admin
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-100" aria-current="page">
            Gestão Diária
          </li>
        </ol>
      </nav>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Gestão Diária</h1>
      <p className="text-slate-400 mb-6">
        Ferramentas de gestão diária da loja, acessíveis a todos os utilizadores.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
        {CARDS.map(({ href, label, description }) => (
          <a key={href} href={href} className="block">
            <Card className="p-5 hover:border-emerald-500/50 transition-colors h-full block">
              <h2 className="text-lg font-medium text-slate-100 mb-1">{label}</h2>
              <p className="text-sm text-slate-400">{description}</p>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
