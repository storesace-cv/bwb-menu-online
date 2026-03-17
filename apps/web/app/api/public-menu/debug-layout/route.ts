import { getSupabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET ?host=... — Diagnóstico: qual template (e layout) é usado na primeira secção e categorias do menu.
 * Útil para confirmar se a secção/categoria está associada ao modelo editado (ex.: "Modelo Prato de Dia 1").
 * Resposta: store_name, first_section_name, section_template_name, categories[{ resolved_template_name, layout_zone_order, layout_zone_icon_sizes }].
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const host = searchParams.get("host") ?? "";

  if (!host) {
    return NextResponse.json(
      { error: "Missing host (query param: ?host=subdominio.menu.bwb.pt)" },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("public_menu_layout_debug", {
      p_host: host,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? {}, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Debug layout failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
