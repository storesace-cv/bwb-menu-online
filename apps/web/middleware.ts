import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { portalDebugLog } from "@/lib/portal-debug-log";

const GLOBAL_HOST = "menu.bwb.pt";
const PORTAL_ADMIN = "/portal-admin";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? request.headers.get("x-forwarded-host") ?? "";
  const pathname = request.nextUrl.pathname;

  const nextAction = request.headers.get("next-action") ?? request.headers.get("Next-Action") ?? "";
  const method = request.method;
  const isPortalAdminPost = method === "POST" && pathname.startsWith(PORTAL_ADMIN) && !pathname.startsWith(`${PORTAL_ADMIN}/login`);
  portalDebugLog("middleware", {
    pathname,
    host,
    rsc: request.headers.get("rsc") ?? request.headers.get("RSC") ?? null,
    redirectRoot: host === GLOBAL_HOST && pathname === "/",
    hasNextAction: nextAction.length > 0,
    likelyActionPost: isPortalAdminPost,
  });

  // menu.bwb.pt root -> redirect to portal-admin
  if (host === GLOBAL_HOST && pathname === "/") {
    return NextResponse.redirect(new URL(PORTAL_ADMIN, request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-portal-host", host);
  if (isPortalAdminPost) requestHeaders.set("x-portal-action-post", "1");
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("x-pathname", pathname);
  res.headers.set("x-portal-host", host);
  if (pathname === "/" && host !== GLOBAL_HOST) {
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  }
  return res;
}

export const config = {
  matcher: ["/", "/portal-admin", "/portal-admin/:path*"],
};
