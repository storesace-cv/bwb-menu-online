import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const version =
    process.env.COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    "dev";

  return NextResponse.json(
    {
      status: "ok",
      version,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
