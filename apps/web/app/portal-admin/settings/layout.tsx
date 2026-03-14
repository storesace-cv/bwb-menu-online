import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost, getPortalMode } from "@/lib/portal-mode";
import { portalDebugLog } from "@/lib/portal-debug-log";
import { RedirectTo } from "../redirect-client";

const REDIRECT_MENU = "/portal-admin/menu";

export default async function PortalAdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const nextAction = (headersList.get("next-action") ?? headersList.get("Next-Action") ?? "").trim();
  const portalActionPost = headersList.get("x-portal-action-post") === "1";
  if (nextAction !== "" || portalActionPost) return <>{children}</>;

  const host = getPortalHost(headersList);
  const pathname = headersList.get("x-pathname") ?? "/portal-admin/settings";
  const mode = getPortalMode(host, pathname);
  const isRsc = headersList.get("rsc") === "1" || headersList.get("RSC") === "1";

  if (mode !== "tenant") return <>{children}</>;

  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });
  if (!storeId) {
    portalDebugLog("settings_layout", { pathname, host, isRsc, reason: "no_storeId", redirectTo: REDIRECT_MENU });
    if (isRsc) return <RedirectTo url={REDIRECT_MENU} />;
    redirect(REDIRECT_MENU);
  }
  const { data: canAccess } = await supabase.rpc("current_user_can_access_settings", { p_store_id: storeId });
  if (!canAccess) {
    portalDebugLog("settings_layout", { pathname, host, isRsc, reason: "no_access", redirectTo: REDIRECT_MENU });
    if (isRsc) return <RedirectTo url={REDIRECT_MENU} />;
    redirect(REDIRECT_MENU);
  }

  return <>{children}</>;
}
