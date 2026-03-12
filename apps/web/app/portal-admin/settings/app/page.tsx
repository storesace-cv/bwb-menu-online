import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import Link from "next/link";
import { SettingsForm } from "../settings-form";
import { IntegrationForm } from "../integration-form";

export default async function ParamsAppPage() {
  const headersList = await headers();
  const host = getPortalHost(headersList);
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Parâmetros App</h1>
        <p className="text-slate-400">Domínio não associado a nenhuma loja.</p>
        <p className="mt-4"><Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</Link></p>
      </div>
    );
  }

  const { data: store } = await supabase.from("stores").select("name").eq("id", storeId).single();
  const { data: row } = await supabase.from("store_settings").select("settings").eq("store_id", storeId).single();
  const settings = (row?.settings as Record<string, string> | null) ?? {};
  const menuTemplateKey = settings.menu_template_key ?? "bwb-branco";

  const { data: featuredTemplates } = await supabase
    .from("menu_featured_presentation_templates")
    .select("id, name, component_key")
    .order("name");

  const { data: lastRunRow } = await supabase
    .from("sync_runs")
    .select("id, status, started_at, finished_at, counts, error")
    .eq("store_id", storeId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastRun = lastRunRow ?? null;

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Parâmetros App</h1>
      <p className="text-slate-400 mb-2">Tema e branding para o menu público desta loja. {store?.name && `Loja: ${store.name}`}</p>
      <p className="mb-6">
        <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</Link>
        {" · "}
        <Link href="/portal-admin/menu" className="text-emerald-400 hover:text-emerald-300">Menu</Link>
        {" · "}
        <Link href="/portal-admin/sync" className="text-emerald-400 hover:text-emerald-300">Sync</Link>
      </p>
      <SettingsForm
        storeId={storeId}
        featuredTemplates={featuredTemplates ?? []}
        initial={{
            store_display_name: settings.store_display_name ?? "",
            primary_color: settings.primary_color ?? "",
            logo_url: settings.logo_url ?? "",
            logo_fill_color: settings.logo_fill_color ?? "",
            logo_stroke_color: settings.logo_stroke_color ?? "",
            currency_code: settings.currency_code ?? "",
            menu_template_key: menuTemplateKey,
            hero_text: settings.hero_text ?? "",
            hero_background_color: settings.hero_background_color ?? "",
            hero_background_css: settings.hero_background_css ?? "",
            footer_logo_url: settings.footer_logo_url ?? "",
            footer_logo_fill_color: settings.footer_logo_fill_color ?? "",
            footer_logo_stroke_color: settings.footer_logo_stroke_color ?? "",
            footer_address: (settings.footer_address ?? "").trim() || (settings.footer_text ?? "").trim() || "",
            footer_email: settings.footer_email ?? "",
            footer_phone: settings.footer_phone ?? "",
            footer_background_color: settings.footer_background_color ?? "",
            footer_background_css: settings.footer_background_css ?? "",
            footer_text_color: settings.footer_text_color ?? "",
            contact_url: settings.contact_url ?? "",
            privacy_url: settings.privacy_url ?? "",
            reservation_url: settings.reservation_url ?? "",
            featured_section_label: settings.featured_section_label ?? "",
            featured_template_key: settings.featured_template_key ?? "modelo-destaque-1",
            featured_carousel_background_color: settings.featured_carousel_background_color ?? "",
            featured_carousel_background_css: settings.featured_carousel_background_css ?? "",
            featured_dots_background_color: settings.featured_dots_background_color ?? "",
            featured_dots_background_css: settings.featured_dots_background_css ?? "",
          }}
      />

      <div className="mt-6">
        <IntegrationForm storeId={storeId} lastRun={lastRun} />
      </div>
    </div>
  );
}
