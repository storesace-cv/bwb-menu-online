import { headers } from "next/headers";
import { getPublicMenuInitialByHostname } from "@/lib/supabase";
import { PublicMenuClient } from "@/components/public-menu-client";
import { TenantDisabledView } from "@/components/tenant-disabled-view";

export const dynamic = "force-dynamic";

export default async function Home() {
  const headersList = await headers();
  const host = headersList.get("host") ?? headersList.get("x-forwarded-host") ?? "";

  const menu = await getPublicMenuInitialByHostname(host);

  if (menu.error) {
    return (
      <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>
        <h1>BWB Menu Online</h1>
        <p>Nenhuma loja encontrada para este endereço.</p>
        <p style={{ fontSize: "0.875rem", color: "#666" }}>{menu.error}</p>
      </main>
    );
  }

  if (menu.tenant_disabled) {
    return (
      <main className="min-h-screen w-full">
        <TenantDisabledView />
      </main>
    );
  }

  if (!menu.store_id || !menu.categories?.length) {
    return (
      <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>
        <h1>BWB Menu Online</h1>
        <p>Menu em construção.</p>
      </main>
    );
  }

  return (
    <main className="menu-public min-h-screen flex flex-col px-1 py-4 md:px-4 w-full">
      <div className="flex-1 flex flex-col min-h-0">
        <PublicMenuClient menu={menu} />
      </div>
    </main>
  );
}
