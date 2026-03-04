/**
 * NET-bo connector (server-only). Discovery, auth, fetch products.
 * Credentials come from store_integrations.config (never exposed to client).
 */

const COMPANIES_API = "https://companies.api.net-bo.com";
const AUTH_TIMEOUT_MS = 15000;
const FETCH_TIMEOUT_MS = 60000;

export type NetboConfig = {
  dbname: string;
  auth_method: "login_password" | "api_token";
  login?: string;
  password?: string;
  api_token?: string;
  server_hint?: string;
};

export type NetboProduct = {
  id?: string | number;
  name?: string;
  unit?: string;
  price?: number;
  vat_rate?: number;
  [key: string]: unknown;
};

/** Discovery: resolve server from company dbname */
export async function netboDiscovery(dbname: string): Promise<{ server: string }> {
  const url = `${COMPANIES_API}/companies/detailed?company=${encodeURIComponent(dbname)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(AUTH_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`NET-bo discovery failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { server?: string; [key: string]: unknown };
  const server = data?.server ?? data?.Server ?? data?.host;
  if (!server || typeof server !== "string") {
    throw new Error("NET-bo discovery: server not found in response");
  }
  return { server: server.replace(/^https?:\/\//, "").replace(/\/$/, "") };
}

/** Auth: return token (from api_token or from login endpoint) */
export async function netboAuth(config: NetboConfig): Promise<string> {
  if (config.auth_method === "api_token" && config.api_token) {
    return config.api_token;
  }
  if (config.auth_method === "login_password" && config.login && config.password) {
    let server = config.server_hint;
    if (!server) {
      const disc = await netboDiscovery(config.dbname);
      server = disc.server;
    }
    const base = `https://${server}.api.net-bo.com`;
    const url = `${base}/api/auth?db=${encodeURIComponent(config.dbname)}&login=${encodeURIComponent(config.login)}&passwd=${encodeURIComponent(config.password)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(AUTH_TIMEOUT_MS) });
    if (!res.ok) {
      throw new Error(`NET-bo auth failed: ${res.status}`);
    }
    const text = await res.text();
    let token = "";
    try {
      const json = JSON.parse(text) as { token?: string; access_token?: string };
      token = json.token ?? json.access_token ?? "";
    } catch {
      token = text.trim();
    }
    if (!token) {
      throw new Error("NET-bo auth: no token in response");
    }
    return token;
  }
  throw new Error("NET-bo: invalid config (auth_method or credentials missing)");
}

/** Fetch products from NET-bo */
export async function netboFetchProducts(
  config: NetboConfig,
  token: string
): Promise<NetboProduct[]> {
  let server = config.server_hint;
  if (!server) {
    const disc = await netboDiscovery(config.dbname);
    server = disc.server;
  }
  const base = `https://${server}.api.net-bo.com`;
  const url = `${base}/api/tables/products?db=${encodeURIComponent(config.dbname)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`NET-bo products failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as NetboProduct[] | { data?: NetboProduct[]; products?: NetboProduct[] };
  if (Array.isArray(data)) {
    return data;
  }
  return (data as { data?: NetboProduct[] }).data ?? (data as { products?: NetboProduct[] }).products ?? [];
}

/** Normalize product to catalog_item row (external_id, name_original, unit, price_original, vat_rate, external_hash for change detection) */
export function normalizeProduct(
  p: NetboProduct,
  storeId: string,
  sourceType: string
): {
  store_id: string;
  source_type: string;
  external_id: string;
  name_original: string | null;
  unit: string | null;
  price_original: number | null;
  vat_rate: number | null;
  is_active: boolean;
  external_hash: string | null;
  external_updated_at: string | null;
} {
  const id = p.id ?? (p as { Id?: string }).Id ?? (p as { product_id?: string }).product_id;
  const external_id = String(id ?? "");
  const name = p.name ?? (p as { Name?: string }).Name ?? (p as { name_original?: string }).name_original ?? null;
  const unit = p.unit ?? (p as { Unit?: string }).Unit ?? null;
  const price = typeof p.price === "number" ? p.price : (p as { Price?: number }).Price ?? (p as { price_original?: number }).price_original ?? null;
  const vat_rate = typeof p.vat_rate === "number" ? p.vat_rate : (p as { vat_rate?: number }).vat_rate ?? null;
  const raw = JSON.stringify({ id, name, unit, price, vat_rate });
  const external_hash = raw ? Buffer.from(raw).toString("base64").slice(0, 64) : null;
  const external_updated_at = new Date().toISOString();

  return {
    store_id: storeId,
    source_type: sourceType,
    external_id,
    name_original: name ?? null,
    unit,
    price_original: price,
    vat_rate,
    is_active: true,
    external_hash,
    external_updated_at,
  };
}
