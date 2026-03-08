import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/admin";
import { LayoutEditorClient } from "./layout-editor-client";
import type { LayoutDefinition } from "@/lib/presentation-templates";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function PresentationTemplateLayoutPage({ params }: Props) {
  const { id } = await params;
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

  const { data: template } = await supabase
    .from("menu_presentation_templates")
    .select("id, name, layout_definition")
    .eq("id", id)
    .single();

  if (!template) notFound();

  const initialLayout: LayoutDefinition | null =
    template.layout_definition != null &&
    typeof template.layout_definition === "object" &&
    Array.isArray((template.layout_definition as LayoutDefinition).zoneOrder)
      ? (template.layout_definition as LayoutDefinition)
      : null;

  return (
    <div>
      <p className="mb-6">
        <Link href="/portal-admin/settings/presentation-templates" className="text-emerald-400 hover:text-emerald-300">
          ← Modelos de apresentação
        </Link>
      </p>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Editar layout — {template.name}</h1>
      <p className="text-slate-400 mb-6">
        Ajuste a altura do card e a ordem dos campos. Pode adicionar ou remover campos da lista (apenas os existentes).
      </p>
      <Card>
        <LayoutEditorClient templateId={template.id} templateName={template.name} initialLayout={initialLayout} />
      </Card>
    </div>
  );
}
