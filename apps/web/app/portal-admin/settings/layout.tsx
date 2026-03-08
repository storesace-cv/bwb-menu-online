import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost, getPortalMode } from "@/lib/portal-mode";
import { RedirectTo } from "../redirect-client";

export default async function PortalAdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const host = getPortalHost(headersList);
  const pathname = headersList.get("x-pathname") ?? "/portal-admin/settings";
  const mode = getPortalMode(host, pathname);

  if (mode !== "tenant") return <>{children}</>;

  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });
  if (!storeId) {
    redirect("/portal-admin/menu");
  }
  const { data: canAccess } = await supabase.rpc("current_user_can_access_settings", { p_store_id: storeId });
  if (!canAccess) {
    if (headersList.get("rsc") === "1" || headersList.get("RSC") === "1") {
      return <RedirectTo url="/portal-admin/menu" />;
    }
    redirect("/portal-admin/menu");
  }

  return <>{children}</>;
}
