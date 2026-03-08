import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPortalHost, getPortalMode } from "@/lib/portal-mode";

export default async function PortalAdminPage() {
  const headersList = await headers();
  const host = getPortalHost(headersList);
  const mode = getPortalMode(host, "/portal-admin");

  if (mode === "global") {
    redirect("/portal-admin/tenants");
  }
  redirect("/portal-admin/menu");
}
