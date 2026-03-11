import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import Link from "next/link";
import { Card } from "@/components/admin";
import { MenuUpdatesClient } from "./menu-updates-client";

export const dynamic = "force-dynamic";

export default async function MenuUpdatesPage() {
  const headersList = await headers();
  const host = getPortalHost(headersList);
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Actualizações ao Menu</h1>
        <p className="text-slate-400">Domínio não associado a nenhuma loja.</p>
        <p className="mt-4">
          <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300" prefetch={false}>
            ← Definições
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Actualizações ao Menu</h1>
      <p className="text-slate-400 mb-6">
        Exporte os dados do menu para Excel para editar nomes, tipos, secções e categorias. Re-importe o ficheiro para actualizar a base de dados. O ficheiro inclui o código do artigo como chave; apenas artigos existentes são actualizados.
      </p>
      <p className="mb-6">
        <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300" prefetch={false}>
          ← Definições
        </Link>
        {" · "}
        <Link href="/portal-admin/settings/items" className="text-emerald-400 hover:text-emerald-300" prefetch={false}>
          Gestão de Artigos
        </Link>
      </p>

      <MenuUpdatesClient />
    </div>
  );
}
