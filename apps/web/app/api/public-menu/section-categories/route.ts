import { getPublicMenuSectionCategories } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET: categorias (com itens) de uma secção para lazy load no menu público. Query: host, sectionId, currencyCode (opcional). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const host = searchParams.get("host") ?? "";
  const sectionId = searchParams.get("sectionId") ?? "";
  const currencyCode = searchParams.get("currencyCode") ?? undefined;

  if (!host || !sectionId) {
    return NextResponse.json(
      { error: "Missing host or sectionId" },
      { status: 400 }
    );
  }

  try {
    const categories = await getPublicMenuSectionCategories(
      host,
      sectionId,
      currencyCode
    );
    return NextResponse.json({ categories });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load section";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
