import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import Link from "next/link";
import { ImageImportClient } from "./image-import-client";

function normalizeStoreId(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === "string" && data.trim() !== "") return data.trim();
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    return typeof first === "string" && first.trim() !== "" ? first.trim() : null;
  }
  return null;
}

export default async function ImageImportPage() {
  try {
    const headersList = await headers();
    const host = getPortalHost(headersList);
    const supabase = await createClient();
    const { data: storeIdRaw } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });
    const storeId = normalizeStoreId(storeIdRaw);

    let imageSource = "storage";
    if (storeId) {
      const { data: row, error: settingsError } = await supabase
        .from("store_settings")
        .select("settings")
        .eq("store_id", storeId)
        .maybeSingle();
      if (!settingsError && row?.settings != null && typeof row.settings === "object") {
        const settings = row.settings as Record<string, unknown>;
        const src = settings.image_source;
        if (src === "url" || src === "legacy_path") imageSource = src;
      }
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
  } catch (e) {
    console.error("[image-import page]", e);
    return (
      <div>
        <p className="text-slate-400">Não foi possível carregar. Tente novamente.</p>
        <Link href="/portal-admin/settings" className="text-emerald-400 hover:underline mt-2 inline-block">
          Voltar às Definições
        </Link>
      </div>
    );
  }
}
