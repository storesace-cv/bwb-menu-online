import { NextResponse } from "next/server";
import { lastPortalLayoutRequest } from "@/lib/portal-debug-log";

/** Temporarily no PORTAL_DEBUG check so we can verify layout headers after Guardar POST. */
export async function GET() {
  return NextResponse.json(lastPortalLayoutRequest ?? { message: "no request captured yet" });
}
