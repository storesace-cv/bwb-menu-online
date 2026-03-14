import { NextResponse } from "next/server";

/** Debug endpoint (PORTAL_DEBUG=1). Layout request capture was removed after Guardar fix. */
export async function GET() {
  if (process.env.PORTAL_DEBUG !== "1") {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.json({ message: "action-headers capture removed" });
}
