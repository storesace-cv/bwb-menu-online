import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import Link from "next/link";
import { Card } from "@/components/admin";
import { ImageSamplesClient } from "./image-samples-client";
import { deleteImageSample } from "../../actions";

export const dynamic = "force-dynamic";

const BUCKET = "menu-images";

function debugLog2129fe(payload: { hypothesisId: string; location: string; message: string; data?: Record<string, unknown> }) {
  try {
    console.log("[debug-2129fe]", JSON.stringify({ sessionId: "2129fe", ...payload, timestamp: Date.now() }));
  } catch (_) {}
}

function previewUrl(imageBasePath: string): string {
  const base = typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string"
    ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")
    : "";
  if (!base || !imageBasePath || imageBasePath === "pending") return "";
  return `${base}/storage/v1/object/public/${BUCKET}/${imageBasePath}640.webp`;
}

export default async function ImageSamplesPage() {
  try {
    // #region agent log
    debugLog2129fe({ hypothesisId: "E", location: "image-samples:try-started", message: "page try started" });
    // #endregion
    const headersList = await headers();
    const host = getPortalHost(headersList);
    // #region agent log
    debugLog2129fe({ hypothesisId: "E", location: "image-samples:after-headers", message: "headers/host ok", data: { host } });
    // #endregion
    const supabase = await createClient();
    const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });
    // #region agent log
    debugLog2129fe({ hypothesisId: "E", location: "image-samples:after-storeId", message: "storeId ok", data: { storeId } });
    // #endregion

    if (storeId) {
      return (
        <div>
          <p className="text-slate-400">Esta página só está disponível nas Definições globais (menu.bwb.pt).</p>
          <p className="mt-4">
            <a href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</a>
          </p>
        </div>
      );
    }

    const { data: { user } } = await supabase.auth.getUser();
    // #region agent log
    debugLog2129fe({ hypothesisId: "E", location: "image-samples:after-getUser", message: "getUser ok", data: { hasUser: !!user } });
    // #endregion
    if (!user) {
      return (
        <div>
          <p className="text-slate-400">
            Sessão inválida. <Link href="/portal-admin/login" className="text-emerald-400 hover:underline">Iniciar sessão</Link>.
          </p>
        </div>
      );
    }

    const { data: isSuper } = await supabase.rpc("current_user_is_superadmin");
    // #region agent log
    debugLog2129fe({ hypothesisId: "E", location: "image-samples:after-isSuper", message: "isSuper ok", data: { isSuper } });
    // #endregion
    if (!isSuper) {
      return (
        <div>
          <p className="text-slate-400">Acesso reservado a superadmin.</p>
          <p className="mt-4">
            <a href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</a>
          </p>
        </div>
      );
    }

    const { data: samples, error: samplesError } = await supabase
      .from("image_samples")
      .select("id, name, image_base_path, created_at")
      .order("created_at", { ascending: false });
    // #region agent log
    debugLog2129fe({ hypothesisId: "E", location: "image-samples:after-samples", message: "samples query done", data: { count: (samples ?? []).length, error: samplesError?.message ?? null } });
    // #endregion

    const samplesWithPreview = (samples ?? []).map((s) => ({
      ...s,
      preview_url: previewUrl(s.image_base_path ?? ""),
    }));
    // #region agent log
    debugLog2129fe({ hypothesisId: "D", location: "image-samples:before-return", message: "about to return JSX", data: { samplesLen: samplesWithPreview.length } });
    // #endregion

    return (
      <div>
        <p className="mb-6">
          <a href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</a>
        </p>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Samples de Imagens</h1>
        <p className="text-slate-400 mb-6">
          Carregue aqui as imagens que as categorias podem usar como imagem de fallback. Em Definições → Categorias, ao editar uma categoria, pode escolher uma destas imagens; no menu público, os artigos dessa categoria sem foto própria passam a mostrar a imagem da categoria.
        </p>

        <section className="mb-8">
          <Card className="p-5 bg-slate-800/50 border-slate-700">
            <h2 className="text-lg font-medium text-slate-200 mb-3">Carregar sample</h2>
            <ImageSamplesClient />
          </Card>
        </section>

        <section>
          <h2 className="text-lg font-medium text-slate-200 mb-3">Lista de samples</h2>
          {samplesWithPreview.length === 0 ? (
            <p className="text-slate-500">Nenhum sample. Carregue um acima.</p>
          ) : (
            <ul className="space-y-4">
              {samplesWithPreview.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  {s.preview_url ? (
                    <img
                      src={s.preview_url}
                      alt={s.name ?? "Sample"}
                      className="h-20 w-20 object-cover rounded border border-slate-600"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded border border-slate-600 bg-slate-700 flex items-center justify-center text-slate-500 text-xs">
                      —
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-200 font-medium">{s.name || "Sem nome"}</p>
                    <p className="text-slate-500 text-sm truncate">{s.image_base_path}</p>
                  </div>
                  <form action={(fd: FormData) => { void deleteImageSample(null, fd); }} className="inline">
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-sm rounded border border-red-600/60 text-red-400 hover:bg-red-600/20 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Apagar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  } catch (e) {
    // #region agent log
    debugLog2129fe({ hypothesisId: "E", location: "image-samples:catch", message: "page catch", data: { error: String(e), name: (e as Error)?.name, digest: (e as Error & { digest?: string })?.digest } });
    // #endregion
    console.error("[image-samples]", e);
    return (
      <div>
        <p className="text-slate-400">Erro ao carregar os dados. Tente novamente.</p>
        <p className="mt-4 flex flex-wrap gap-4">
          <a href="/portal-admin/settings/image-samples" className="text-emerald-400 hover:text-emerald-300">
            Tentar de novo
          </a>
          <a href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">
            ← Definições
          </a>
        </p>
      </div>
    );
  }
}
