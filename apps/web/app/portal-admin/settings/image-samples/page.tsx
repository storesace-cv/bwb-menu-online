import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import Link from "next/link";
import { Card } from "@/components/admin";
import { ImageSamplesClient } from "./image-samples-client";
import { deleteImageSampleFormAction } from "../../actions";

export const dynamic = "force-dynamic";

const BUCKET = "menu-images";

function previewUrl(imageBasePath: string): string {
  const base = typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string"
    ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")
    : "";
  if (!base || !imageBasePath || imageBasePath === "pending") return "";
  return `${base}/storage/v1/object/public/${BUCKET}/${imageBasePath}640.webp`;
}

export default async function ImageSamplesPage() {
  try {
    const headersList = await headers();
    const host = getPortalHost(headersList);
    const supabase = await createClient();
    const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

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

    const { data: samples } = await supabase
      .from("image_samples")
      .select("id, name, image_base_path, created_at")
      .order("created_at", { ascending: false });

    const samplesWithPreview = (samples ?? []).map((s) => ({
      ...s,
      preview_url: previewUrl(s.image_base_path ?? ""),
    }));

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
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {samplesWithPreview.map((s) => (
                <li key={s.id} className="flex flex-col rounded-lg bg-slate-800/50 border border-slate-700 overflow-hidden">
                  <div className="aspect-square w-full bg-slate-700/50 flex items-center justify-center shrink-0">
                    {s.preview_url ? (
                      <img
                        src={s.preview_url}
                        alt={s.name ?? "Sample"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-slate-500 text-sm">—</span>
                    )}
                  </div>
                  <div className="p-3 flex flex-col gap-2 min-w-0">
                    <p className="text-slate-200 font-medium truncate">{s.name || "Sem nome"}</p>
                    <p className="text-slate-500 text-sm truncate">{s.image_base_path}</p>
                    <form action={deleteImageSampleFormAction} className="mt-auto">
                      <input type="hidden" name="id" value={s.id} />
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-sm rounded border border-red-600/60 text-red-400 hover:bg-red-600/20 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Apagar
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  } catch (e) {
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
