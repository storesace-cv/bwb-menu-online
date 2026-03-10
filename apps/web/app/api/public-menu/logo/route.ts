import { NextRequest, NextResponse } from "next/server";

const CACHE_MAX_AGE = 60; // 1 minute

/** Allowed hostnames for logo URL (anti-SSRF). Same origin + Supabase storage. */
function isAllowedLogoUrl(url: URL, requestHost: string): boolean {
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return false;
  // Private / link-local
  if (host.startsWith("10.") || host.startsWith("172.16.") || host.startsWith("192.168.")) return false;
  if (host === "::1") return false;
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;

  const reqHost = requestHost.toLowerCase().replace(/:.*$/, "");
  if (host === reqHost || host.endsWith("." + reqHost)) return true;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      const su = new URL(supabaseUrl);
      const sh = su.hostname.toLowerCase();
      if (host === sh || host.endsWith("." + sh)) return true;
    } catch {
      // ignore
    }
  }
  if (host.endsWith(".supabase.co")) return true;
  return false;
}

/** Replace fill and/or stroke in SVG string. Conservative: only replace attribute and style fill/stroke. */
function applySvgColors(svg: string, fill?: string, stroke?: string): string {
  let out = svg;
  if (fill && /^#[0-9A-Fa-f]{6}$/.test(fill)) {
    out = out.replace(/\bfill\s*=\s*["'][^"']*["']/gi, () => `fill="${fill}"`);
    out = out.replace(/\bfill\s*:\s*[^;]+/gi, () => `fill: ${fill}`);
  }
  if (stroke && /^#[0-9A-Fa-f]{6}$/.test(stroke)) {
    out = out.replace(/\bstroke\s*=\s*["'][^"']*["']/gi, () => `stroke="${stroke}"`);
    out = out.replace(/\bstroke\s*:\s*[^;]+/gi, () => `stroke: ${stroke}`);
  }
  return out;
}

/**
 * GET /api/public-menu/logo?url=...&fill=...&stroke=...
 * Fetches the logo URL (must be SVG when fill/stroke are used), applies optional fill/stroke colors, returns SVG.
 * Allowed URLs: same origin + Supabase URL host (e.g. storage). Anti-SSRF.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const urlParam = searchParams.get("url") ?? "";
  const fill = (searchParams.get("fill") ?? "").trim();
  const stroke = (searchParams.get("stroke") ?? "").trim();

  if (!urlParam) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const requestHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (!isAllowedLogoUrl(parsed, requestHost)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  let res: Response;
  try {
    res = await fetch(parsed.toString(), {
      headers: { "User-Agent": "BWB-Menu-Online/1" },
      next: { revalidate: CACHE_MAX_AGE },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fetch failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: "Upstream error" }, { status: res.status === 404 ? 404 : 502 });
  }

  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
  const isSvg = contentType.includes("svg") || parsed.pathname.toLowerCase().endsWith(".svg");
  const body = await res.text();
  const trimmed = body.trim();
  if (!isSvg || (!trimmed.startsWith("<?xml") && !trimmed.startsWith("<svg"))) {
    return NextResponse.json({ error: "Not an SVG resource" }, { status: 400 });
  }

  const modified = applySvgColors(body, fill || undefined, stroke || undefined);

  return new NextResponse(modified, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE}`,
    },
  });
}
