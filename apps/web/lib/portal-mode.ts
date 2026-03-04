/**
 * Determina o modo do portal a partir do host e pathname.
 * Usado no layout do portal-admin para guardas e redirecionamentos.
 */
export type PortalMode = "global" | "tenant" | "public";

const GLOBAL_HOST = "menu.bwb.pt";

export function getPortalMode(host: string, pathname: string): PortalMode {
  const h = host.split(":")[0].toLowerCase();
  if (h === GLOBAL_HOST && pathname.startsWith("/portal-admin")) return "global";
  if (h.endsWith(".menu.bwb.pt") && h !== GLOBAL_HOST && pathname.startsWith("/portal-admin")) return "tenant";
  return "public";
}

export function isGlobalAdmin(host: string, pathname: string): boolean {
  return getPortalMode(host, pathname) === "global";
}

export function isTenantAdmin(host: string, pathname: string): boolean {
  return getPortalMode(host, pathname) === "tenant";
}
