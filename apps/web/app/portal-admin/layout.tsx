import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getPortalMode } from "@/lib/portal-mode";
import Link from "next/link";

const PORTAL_LOGIN = "/portal-admin/login";
const CHANGE_PASSWORD = "/portal-admin/change-password";

export default async function PortalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const host = headersList.get("host") ?? headersList.get("x-forwarded-host") ?? "";
  const pathname = headersList.get("x-pathname") ?? "/portal-admin";
  const mode = getPortalMode(host, pathname);
  const isLoginPage = pathname === "/portal-admin/login" || pathname.startsWith("/portal-admin/login/");

  if (isLoginPage) {
    return <>{children}</>;
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return (
      <div style={{ padding: "2rem" }}>
        <p>Configuração Supabase em falta.</p>
        <Link href={PORTAL_LOGIN}>Login</Link>
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(PORTAL_LOGIN);
  }

  const mustChange = (user.user_metadata as { must_change_password?: boolean })?.must_change_password === true;
  if (mustChange && !pathname.includes("change-password")) {
    redirect(CHANGE_PASSWORD);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ borderBottom: "1px solid #eee", padding: "0.75rem 1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <Link href="/portal-admin" style={{ fontWeight: "bold" }}>Portal Admin</Link>
        <span style={{ color: "#666" }}>{mode === "global" ? "Global" : "Loja"}</span>
        {mode === "global" && <Link href="/portal-admin/tenants">Tenants</Link>}
        {mode === "global" && <Link href="/portal-admin/users">Utilizadores</Link>}
        <Link href="/portal-admin/menu">Menu</Link>
        {mode === "tenant" && <Link href="/portal-admin/items">Itens</Link>}
        {mode === "tenant" && <Link href="/portal-admin/sync">Sync</Link>}
        {mode === "tenant" && <Link href="/portal-admin/settings">Definições</Link>}
        <form action="/api/auth/signout" method="post" style={{ marginLeft: "auto" }}>
          <button type="submit">Sair</button>
        </form>
      </header>
      <main style={{ padding: "1.5rem", flex: 1 }}>{children}</main>
    </div>
  );
}
