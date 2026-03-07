import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { AISettingsForm } from "./ai-settings-form";

export default async function AISettingsPage() {
  const headersList = await headers();
  const host = headersList.get("x-portal-host") ?? headersList.get("host") ?? "";
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">ChatGPT / Grok</h1>
        <p className="text-slate-400">Domínio não associado a nenhuma loja.</p>
        <p className="mt-4">
          <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">
            ← Definições
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">ChatGPT / Grok</h1>
      <p className="text-slate-400 mb-6">
        Configure a ligação a um provider de IA (BYO-KEY) para funcionalidades como &quot;Gerar descrição&quot; no editor de artigos.
      </p>
      <p className="mb-6">
        <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">
          ← Definições
        </Link>
        {" · "}
        <Link href="/portal-admin/settings/items" className="text-emerald-400 hover:text-emerald-300">
          Gestão de Artigos
        </Link>
      </p>
      <AISettingsForm storeId={storeId} />
    </div>
  );
}
