/**
 * Determina o modo do portal a partir do host e pathname.
 * Usado no layout do portal-admin para guardas e redirecionamentos.
 */
export type PortalMode = "global" | "tenant" | "public";

const GLOBAL_HOST = "menu.bwb.pt";

/**
 * Obtém o host normalizado para resolução de loja no portal-admin.
 * Ordem: x-portal-host → host → x-forwarded-host.
 * Remove a porta quando a parte após ":" é numérica (ex.: :443, :80) para coincidir com store_domains.hostname.
 */
export function getPortalHost(headers: Headers): string {
  const raw =
    headers.get("x-portal-host") ?? headers.get("host") ?? headers.get("x-forwarded-host") ?? "";
  const trimmed = raw.trim();
  const colon = trimmed.indexOf(":");
  if (colon === -1) return trimmed.toLowerCase();
  const hostPart = trimmed.slice(0, colon);
  const portPart = trimmed.slice(colon + 1).trim();
  if (/^\d+$/.test(portPart)) return hostPart.toLowerCase();
  return trimmed.toLowerCase();
}

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
