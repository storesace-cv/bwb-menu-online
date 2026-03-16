import { headers } from "next/headers";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import { DiariasScheduleClient } from "./diarias-schedule-client";

export const dynamic = "force-dynamic";

export default async function DiariasPage() {
  const headersList = await headers();
  const host = getPortalHost(headersList);
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Gestão de Diárias</h1>
        <p className="text-slate-400">Domínio não associado a nenhuma loja. Configure um domínio em Definições (Tenants → Lojas → Domínios).</p>
      </div>
    );
  }

  const { data: items } = await supabase
    .from("menu_items")
    .select("id, menu_name")
    .eq("store_id", storeId)
    .eq("is_dish_of_the_day", true)
    .eq("is_visible", true)
    .order("menu_name", { ascending: true });

  const list = (items ?? []).map((i) => ({ id: i.id, menu_name: (i.menu_name ?? "").trim() || "Sem nome" }));

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
          <li>
            <Link href="/portal-admin/gestao-diaria" className="hover:text-slate-200 transition-colors">
              Gestão Diária
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-100" aria-current="page">
            Gestão de Diárias
          </li>
        </ol>
      </nav>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Gestão de Diárias</h1>
      <p className="text-slate-400 mb-6">
        Programação semanal dos pratos do dia. Defina o nome a mostrar em cada dia (texto livre ou escolha um artigo da lista).
      </p>
      <DiariasScheduleClient items={list} />
    </div>
  );
}
