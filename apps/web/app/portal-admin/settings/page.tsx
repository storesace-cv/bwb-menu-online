import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const headersList = await headers();
  const host = headersList.get("x-portal-host") ?? headersList.get("host") ?? "";
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    return (
      <div>
        <h1>Definições</h1>
        <p>Domínio não associado a nenhuma loja. Configure um domínio em Global Admin (Tenants → Lojas → Domínios).</p>
      </div>
    );
  }

  const { data: store } = await supabase.from("stores").select("name").eq("id", storeId).single();
  const { data: row } = await supabase.from("store_settings").select("settings").eq("store_id", storeId).single();
  const settings = (row?.settings as Record<string, string> | null) ?? {};

  return (
    <div>
      <h1>Definições da loja</h1>
      <p>Tema e branding para o menu público desta loja. {store?.name && `Loja: ${store.name}`}</p>
      <p><Link href="/portal-admin/menu">← Menu</Link> · <Link href="/portal-admin/sync">Sync</Link></p>
      <section style={{ marginTop: "1.5rem" }}>
        <SettingsForm
          storeId={storeId}
          initial={{
            store_display_name: settings.store_display_name ?? "",
            primary_color: settings.primary_color ?? "",
            logo_url: settings.logo_url ?? "",
            currency_code: settings.currency_code ?? "",
          }}
        />
      </section>
    </div>
  );
}
