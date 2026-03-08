import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Card } from "@/components/admin";
import { PresentationTemplatesClient } from "./presentation-templates-client";
import { FeaturedTemplatesClient } from "./featured-templates-client";

export const dynamic = "force-dynamic";

export default async function PresentationTemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
          <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</Link>
        </p>
      </div>
    );
  }

  const { data: templates } = await supabase
    .from("menu_presentation_templates")
    .select("id, name, component_key")
    .order("name");

  const { data: featuredTemplates } = await supabase
    .from("menu_featured_presentation_templates")
    .select("id, name, component_key")
    .order("name");

  const hasModeloDestaque1 = (featuredTemplates ?? []).some((t) => t.name === "Modelo Destaque 1");

  return (
    <div>
      <p className="mb-6">
        <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</Link>
      </p>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Modelos de apresentação</h1>

      <section className="mb-10">
        <h2 className="text-xl font-medium text-slate-200 mb-2">Modelos de apresentação de artigos</h2>
        <p className="text-slate-400 mb-4">
          Modelos disponíveis para secções e categorias do menu. Os tenants podem aplicá-los nas Definições. Pode copiar um modelo para criar uma nova entrada com outro nome (mesmo aspecto no menu).
        </p>
        <Card>
          <PresentationTemplatesClient templates={templates ?? []} />
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-medium text-slate-200 mb-2">Modelos de apresentação de Destaques</h2>
        <p className="text-slate-400 mb-4">
          Estes modelos definem o aspeto dos cards do carrossel de destaques no topo do menu (imagem de fundo e overlay). Pode criar «Modelo Destaque 1» a partir do «Modelo Restaurante 1» e editar o layout (altura do card e ordem dos campos).
        </p>
        <Card>
          <FeaturedTemplatesClient templates={featuredTemplates ?? []} hasModeloDestaque1={hasModeloDestaque1} />
        </Card>
      </section>
    </div>
  );
}
