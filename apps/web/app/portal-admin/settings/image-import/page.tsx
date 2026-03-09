import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import Link from "next/link";
import { ImageImportClient } from "./image-import-client";

export default async function ImageImportPage() {
  const headersList = await headers();
  const host = getPortalHost(headersList);
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  let imageSource = "storage";
  if (storeId) {
    const { data: row } = await supabase.from("store_settings").select("settings").eq("store_id", storeId).maybeSingle();
    const settings = (row?.settings as Record<string, string> | null) ?? {};
    imageSource = settings.image_source === "url" || settings.image_source === "legacy_path" ? settings.image_source : "storage";
  }

  if (!storeId) {
    return (
      <div>
        <p className="text-slate-400">Acesso apenas no contexto de uma loja.</p>
        <Link href="/portal-admin/settings" className="text-emerald-400 hover:underline mt-2 inline-block">
          Voltar às Definições
        </Link>
      </div>
    );
  }

  return (
    <div>
      <nav className="mb-2 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li>
            <Link href="/portal-admin" className="hover:text-slate-200 transition-colors">Portal Admin</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/portal-admin/settings" className="hover:text-slate-200 transition-colors">Definições</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-100" aria-current="page">Gestão de Imagens</li>
        </ol>
      </nav>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Gestão de Imagens</h1>
      <p className="text-slate-400 mb-6">Defina o método de leitura de imagens no menu e importe imagens em lote associadas aos artigos pelo código no nome do ficheiro.</p>
      <ImageImportClient storeId={storeId} initialImageSource={imageSource} />
    </div>
  );
}
