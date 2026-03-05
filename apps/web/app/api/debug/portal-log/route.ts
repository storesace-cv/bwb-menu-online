import { NextResponse } from "next/server";
import { portalDebugLog } from "@/lib/portal-debug-log";

type Body = { event?: string; url?: string; message?: string };

export async function POST(request: Request) {
  if (process.env.PORTAL_DEBUG !== "1") {
    return new NextResponse(null, { status: 204 });
  }
  try {
    const body = (await request.json()) as Body;
    portalDebugLog("client", {
      event: body.event ?? "unknown",
      url: body.url ?? undefined,
      message: body.message ?? undefined,
    });
  } catch {
    // ignore parse errors
  }
  return new NextResponse(null, { status: 204 });
}
