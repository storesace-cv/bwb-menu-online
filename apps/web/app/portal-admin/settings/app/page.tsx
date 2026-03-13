import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
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
        <p className="mt-4"><a href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</a></p>
      </div>
    );
  }

  const { data: store } = await supabase.from("stores").select("name").eq("id", storeId).single();
  const { data: row } = await supabase.from("store_settings").select("settings").eq("store_id", storeId).single();
  const settings = (row?.settings as Record<string, string | number> | null) ?? {};
  const menuTemplateKey = String(settings.menu_template_key ?? "bwb-branco");
  const parseScaleFromSettings = (key: string): number => {
    const v = settings[key];
    if (v == null) return 1;
    const num = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isFinite(num) && num >= 0.75 && num <= 1 ? num : 1;
  };

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
        <a href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">← Definições</a>
        {" · "}
        <a href="/portal-admin/menu" className="text-emerald-400 hover:text-emerald-300">Menu</a>
        {" · "}
        <a href="/portal-admin/sync" className="text-emerald-400 hover:text-emerald-300">Sync</a>
      </p>
      <SettingsForm
        storeId={storeId}
        featuredTemplates={featuredTemplates ?? []}
        initial={{
            store_display_name: String(settings.store_display_name ?? ""),
            primary_color: String(settings.primary_color ?? ""),
            logo_url: String(settings.logo_url ?? ""),
            logo_fill_color: String(settings.logo_fill_color ?? ""),
            logo_stroke_color: String(settings.logo_stroke_color ?? ""),
            currency_code: String(settings.currency_code ?? ""),
            menu_template_key: menuTemplateKey,
            hero_text: String(settings.hero_text ?? ""),
            hero_background_color: String(settings.hero_background_color ?? ""),
            hero_background_css: String(settings.hero_background_css ?? ""),
            footer_logo_url: String(settings.footer_logo_url ?? ""),
            footer_logo_fill_color: String(settings.footer_logo_fill_color ?? ""),
            footer_logo_stroke_color: String(settings.footer_logo_stroke_color ?? ""),
            footer_address: (String(settings.footer_address ?? "").trim() || String(settings.footer_text ?? "").trim()) || "",
            footer_email: String(settings.footer_email ?? ""),
            footer_phone: String(settings.footer_phone ?? ""),
            footer_background_color: String(settings.footer_background_color ?? ""),
            footer_background_css: String(settings.footer_background_css ?? ""),
            footer_text_color: String(settings.footer_text_color ?? ""),
            contact_url: String(settings.contact_url ?? ""),
            privacy_url: String(settings.privacy_url ?? ""),
            reservation_url: String(settings.reservation_url ?? ""),
            featured_section_label: String(settings.featured_section_label ?? ""),
            featured_template_key: String(settings.featured_template_key ?? "modelo-destaque-1"),
            featured_carousel_background_color: String(settings.featured_carousel_background_color ?? ""),
            featured_carousel_background_css: String(settings.featured_carousel_background_css ?? ""),
            featured_dots_background_color: String(settings.featured_dots_background_color ?? ""),
            featured_dots_background_css: String(settings.featured_dots_background_css ?? ""),
            featured_carousel_scale_desktop: parseScaleFromSettings("featured_carousel_scale_desktop"),
            featured_carousel_scale_mobile: parseScaleFromSettings("featured_carousel_scale_mobile"),
          }}
      />

      <div className="mt-6">
        <IntegrationForm storeId={storeId} lastRun={lastRun} />
      </div>
    </div>
  );
}
