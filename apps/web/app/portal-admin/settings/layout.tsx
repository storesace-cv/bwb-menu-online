import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost, getPortalMode } from "@/lib/portal-mode";
import { portalDebugLog } from "@/lib/portal-debug-log";
import { RedirectTo } from "../redirect-client";

const REDIRECT_MENU = "/portal-admin/menu";

function debugLog2129fe(payload: { hypothesisId: string; location: string; message: string; data?: Record<string, unknown> }) {
  try {
    console.log("[debug-2129fe]", JSON.stringify({ sessionId: "2129fe", ...payload, timestamp: Date.now() }));
  } catch (_) {}
}

export default async function PortalAdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // #region agent log
  debugLog2129fe({ hypothesisId: "D", location: "settings-layout:entry", message: "settings layout started" });
  // #endregion
  const headersList = await headers();
  const nextAction = (headersList.get("next-action") ?? headersList.get("Next-Action") ?? "").trim();
  const portalActionPost = headersList.get("x-portal-action-post") === "1";
  if (nextAction !== "" || portalActionPost) return <>{children}</>;

  const host = getPortalHost(headersList);
  const pathname = headersList.get("x-pathname") ?? "/portal-admin/settings";
  const mode = getPortalMode(host, pathname);
  const isRsc = headersList.get("rsc") === "1" || headersList.get("RSC") === "1";
  // #region agent log
  debugLog2129fe({ hypothesisId: "D", location: "settings-layout:after-headers", message: "headers/host ok", data: { pathname, mode } });
  // #endregion

  if (mode !== "tenant") return <>{children}</>;

  const supabase = await createClient();
  // #region agent log
  debugLog2129fe({ hypothesisId: "D", location: "settings-layout:after-createClient", message: "createClient ok" });
  // #endregion
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });
  // #region agent log
  debugLog2129fe({ hypothesisId: "D", location: "settings-layout:after-get-store-id", message: "get_store_id ok", data: { storeId } });
  // #endregion
  if (!storeId) {
    portalDebugLog("settings_layout", { pathname, host, isRsc, reason: "no_storeId", redirectTo: REDIRECT_MENU });
    if (isRsc) return <RedirectTo url={REDIRECT_MENU} />;
    redirect(REDIRECT_MENU);
  }
  const { data: canAccess } = await supabase.rpc("current_user_can_access_settings", { p_store_id: storeId });
  // #region agent log
  debugLog2129fe({ hypothesisId: "D", location: "settings-layout:after-can-access", message: "can_access ok", data: { canAccess } });
  // #endregion
  if (!canAccess) {
    portalDebugLog("settings_layout", { pathname, host, isRsc, reason: "no_access", redirectTo: REDIRECT_MENU });
    if (isRsc) return <RedirectTo url={REDIRECT_MENU} />;
    redirect(REDIRECT_MENU);
  }

  return <>{children}</>;
}
