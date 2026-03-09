import { headers } from "next/headers";
import { getPublicMenuInitialByHostname } from "@/lib/supabase";
import { PublicMenuClient } from "@/components/public-menu-client";

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

  if (!menu.store_id || !menu.categories?.length) {
    return (
      <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>
        <h1>BWB Menu Online</h1>
        <p>Menu em construção.</p>
      </main>
    );
  }

  return (
    <main className="menu-public px-6 py-8 md:px-8 w-full">
      <PublicMenuClient menu={menu} />
    </main>
  );
}
