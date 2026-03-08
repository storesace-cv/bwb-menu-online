import { NextResponse } from "next/server";
import { lastTenantsActionLogs } from "@/lib/portal-debug-log";

export async function GET() {
  if (process.env.PORTAL_DEBUG !== "1") {
    return new NextResponse(null, { status: 404 });
  }
  const entries = [...lastTenantsActionLogs].sort(
    (a, b) =>
      new Date((a.ts as string) ?? 0).getTime() - new Date((b.ts as string) ?? 0).getTime()
  );
  return NextResponse.json(entries);
}
