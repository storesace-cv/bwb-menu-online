import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Card } from "@/components/admin";
import { PresentationTemplatesClient } from "./presentation-templates-client";

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

  return (
    <div>
      <p className="mb-6">
        <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</Link>
      </p>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Modelos de apresentação de artigos</h1>
      <p className="text-slate-400 mb-6">
        Modelos disponíveis para secções e categorias do menu. Os tenants podem aplicá-los nas Definições. Pode copiar um modelo para criar uma nova entrada com outro nome (mesmo aspecto no menu).
      </p>
      <Card>
        <PresentationTemplatesClient templates={templates ?? []} />
      </Card>
    </div>
  );
}
