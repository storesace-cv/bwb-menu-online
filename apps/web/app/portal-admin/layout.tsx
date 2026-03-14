import "./admin.css";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost, getPortalMode } from "@/lib/portal-mode";
import { portalDebugLog, setLastPortalLayoutRequest } from "@/lib/portal-debug-log";
import Link from "next/link";
import { RedirectTo } from "./redirect-client";

const THEME_WRAPPER_CLASS =
  "admin-theme min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex flex-col";

const PORTAL_LOGIN = "/portal-admin/login";
const CHANGE_PASSWORD = "/portal-admin/change-password";

export default async function PortalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const host = getPortalHost(headersList);
  const pathname = headersList.get("x-pathname") ?? "/portal-admin";
  const nextActionHeader = (headersList.get("next-action") ?? headersList.get("Next-Action") ?? "").trim();
  const portalActionPost = headersList.get("x-portal-action-post") === "1";
  const isActionPost = nextActionHeader !== "" || portalActionPost;
  setLastPortalLayoutRequest({ ts: new Date().toISOString(), pathname, nextActionLen: nextActionHeader.length, portalActionPost, isActionPost });
  const mode = getPortalMode(host, pathname);

  if (isActionPost) {
    // #region agent log
    portalDebugLog("presentation_template_layout", { step: "layout_early_return", pathname, host });
    // #endregion
    const linkClass = "text-slate-200 hover:text-emerald-400 transition-colors";
    return (
      <div className={THEME_WRAPPER_CLASS}>
        <header className="bg-slate-800/80 border-b border-slate-700 backdrop-blur-sm shadow-md px-4 py-3 flex flex-wrap gap-4 items-center">
          <Link href="/portal-admin" className="font-bold text-slate-100 hover:text-emerald-400 transition-colors" prefetch={false}>Portal Admin</Link>
          <span className="text-slate-400 text-sm">{mode === "global" ? "Global" : "Loja"}</span>
          {mode === "global" && <Link href="/portal-admin/tenants" className={linkClass} prefetch={false}>Tenants</Link>}
          {mode === "global" && <Link href="/portal-admin/import/mappings" className={linkClass} prefetch={false}>Mapeamentos</Link>}
          {(mode === "global" || mode === "tenant") && (
            <a href="/portal-admin/settings" className={linkClass}>Definições</a>
          )}
          <Link href="/portal-admin/menu" className={linkClass} prefetch={false}>Menu</Link>
          {mode === "tenant" && <Link href="/portal-admin/sync" className={linkClass} prefetch={false}>Sync</Link>}
          <form action="/api/auth/signout" method="post" className="ml-auto">
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Sair
            </button>
          </form>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    );
  }

  try {
    const isLoginPage = pathname === "/portal-admin/login" || pathname.startsWith("/portal-admin/login/");
    const isRsc = headersList.get("rsc") === "1" || headersList.get("RSC") === "1";

    portalDebugLog("layout", { pathname, host, isLoginPage, isRsc, isActionPost });

    if (isLoginPage) {
      portalDebugLog("layout", { pathname, decision: "login_page" });
      return <div className={THEME_WRAPPER_CLASS}>{children}</div>;
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let mustRenew = false;
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("renew_password").eq("id", user.id).single();
      mustRenew = profile?.renew_password === true;
    }

    portalDebugLog("layout", {
      pathname,
      userId: user?.id ?? "anonymous",
      mustRenewPassword: mustRenew,
    });

    if (!user && !isActionPost) {
      portalDebugLog("layout", { pathname, decision: "redirect_login" });
      if (isRsc) return <RedirectTo url={PORTAL_LOGIN} />;
      redirect(PORTAL_LOGIN);
    }

    if (mustRenew && !pathname.includes("change-password") && !isActionPost) {
      portalDebugLog("layout", { pathname, decision: "redirect_change_password" });
      if (isRsc) return <RedirectTo url={CHANGE_PASSWORD} />;
      redirect(CHANGE_PASSWORD);
    }

    let canAccessSettings = true;
    if (mode === "tenant") {
      const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });
      if (storeId) {
        const { data: can } = await supabase.rpc("current_user_can_access_settings", { p_store_id: storeId });
        canAccessSettings = can === true;
      } else {
        canAccessSettings = false;
      }
      if (!canAccessSettings && pathname.startsWith("/portal-admin/settings") && !isActionPost) {
        portalDebugLog("layout", { pathname, decision: "redirect_no_settings_access" });
        if (isRsc) return <RedirectTo url="/portal-admin/menu" />;
        redirect("/portal-admin/menu");
      }
    }

    portalDebugLog("layout", { pathname, decision: "full_layout" });
    const linkClass = "text-slate-200 hover:text-emerald-400 transition-colors";
    return (
      <div className={THEME_WRAPPER_CLASS}>
        <header className="bg-slate-800/80 border-b border-slate-700 backdrop-blur-sm shadow-md px-4 py-3 flex flex-wrap gap-4 items-center">
          <Link href="/portal-admin" className="font-bold text-slate-100 hover:text-emerald-400 transition-colors" prefetch={false}>Portal Admin</Link>
          <span className="text-slate-400 text-sm">{mode === "global" ? "Global" : "Loja"}</span>
          {mode === "global" && <Link href="/portal-admin/tenants" className={linkClass} prefetch={false}>Tenants</Link>}
          {mode === "global" && <Link href="/portal-admin/import/mappings" className={linkClass} prefetch={false}>Mapeamentos</Link>}
          {(mode === "global" || (mode === "tenant" && canAccessSettings)) && (
            <a href="/portal-admin/settings" className={linkClass}>Definições</a>
          )}
          <Link href="/portal-admin/menu" className={linkClass} prefetch={false}>Menu</Link>
          {mode === "tenant" && <Link href="/portal-admin/sync" className={linkClass} prefetch={false}>Sync</Link>}
          <form action="/api/auth/signout" method="post" className="ml-auto">
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Sair
            </button>
          </form>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    );
  } catch (e) {
    const err = e as Error & { digest?: string };
    if (err?.digest?.startsWith?.("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") throw e;
    if (err?.digest?.startsWith?.("NEXT_NOT_FOUND")) throw e;
    portalDebugLog("layout", { pathname, error: String(e) });
    if (isActionPost) {
      const linkClass = "text-slate-200 hover:text-emerald-400 transition-colors";
      return (
        <div className={THEME_WRAPPER_CLASS}>
          <header className="bg-slate-800/80 border-b border-slate-700 backdrop-blur-sm shadow-md px-4 py-3 flex flex-wrap gap-4 items-center">
            <Link href="/portal-admin" className="font-bold text-slate-100 hover:text-emerald-400 transition-colors" prefetch={false}>Portal Admin</Link>
            <span className="text-slate-400 text-sm">{mode === "global" ? "Global" : "Loja"}</span>
            {mode === "global" && <Link href="/portal-admin/tenants" className={linkClass} prefetch={false}>Tenants</Link>}
            {mode === "global" && <Link href="/portal-admin/import/mappings" className={linkClass} prefetch={false}>Mapeamentos</Link>}
            {(mode === "global" || mode === "tenant") && (
              <a href="/portal-admin/settings" className={linkClass}>Definições</a>
            )}
            <Link href="/portal-admin/menu" className={linkClass} prefetch={false}>Menu</Link>
            {mode === "tenant" && <Link href="/portal-admin/sync" className={linkClass} prefetch={false}>Sync</Link>}
            <form action="/api/auth/signout" method="post" className="ml-auto">
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Sair
              </button>
            </form>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      );
    }
    return (
      <div className={THEME_WRAPPER_CLASS}>
        <div className="p-8 max-w-md mx-auto">
          <p className="text-slate-300 mb-4">Erro ao carregar. Verifique a sessão.</p>
          <Link href={PORTAL_LOGIN} className="text-emerald-400 hover:text-emerald-300 underline" prefetch={false}>Login</Link>
        </div>
      </div>
    );
  }
}
