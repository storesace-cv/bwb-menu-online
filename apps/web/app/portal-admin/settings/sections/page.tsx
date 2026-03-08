import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import Link from "next/link";
import { CreateSectionForm } from "../../menu/create-section-form";
import { SectionRow } from "./section-row";
import { SectionTitleAppearanceForm } from "./section-title-appearance-form";
import { Card } from "@/components/admin";

export default async function SectionsPage() {
  const headersList = await headers();
  const host = getPortalHost(headersList);
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Secções</h1>
        <p className="text-slate-400">Domínio não associado a nenhuma loja.</p>
        <p className="mt-4"><Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</Link></p>
      </div>
    );
  }

  const { data: sections } = await supabase
    .from("menu_sections")
    .select("id, name, sort_order, presentation_template_id")
    .eq("store_id", storeId)
    .order("sort_order");

  const { data: presentationTemplates } = await supabase
    .from("menu_presentation_templates")
    .select("id, name")
    .order("name");

  const { data: settingsRow } = await supabase
    .from("store_settings")
    .select("settings")
    .eq("store_id", storeId)
    .maybeSingle();
  const settings = (settingsRow?.settings as Record<string, string> | null) ?? {};

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Secções</h1>
      <p className="text-slate-400 mb-6">Secção é um nível acima de categoria (ex.: Snack-Bar, Restaurante).</p>
      <p className="mb-6">
        <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</Link>
      </p>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Aparência dos títulos de secção no menu</h2>
          <p className="text-slate-400 text-sm mb-4">
            As opções abaixo aplicam-se a todos os títulos de secção do seu menu público (ex.: Snack-Bar, Restaurante).
          </p>
          <SectionTitleAppearanceForm
            storeId={storeId}
            initial={{
              section_title_align: settings.section_title_align,
              section_title_margin_bottom: settings.section_title_margin_bottom,
              section_title_padding_top: settings.section_title_padding_top,
              section_title_color: settings.section_title_color,
            }}
          />
        </Card>
      </section>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Nova secção</h2>
          <CreateSectionForm storeId={storeId} presentationTemplates={presentationTemplates ?? []} />
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Lista de secções</h2>
        <Card>
          {sections && sections.length > 0 ? (
            <ul className="list-none pl-0">
              {sections.map((s) => (
                <SectionRow key={s.id} section={s} presentationTemplates={presentationTemplates ?? []} />
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 py-4">Nenhuma secção. Crie uma acima.</p>
          )}
        </Card>
      </section>
    </div>
  );
}
