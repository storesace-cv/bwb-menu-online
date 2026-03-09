import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key");
  }
  return createClient(url, key);
}

export type PublicMenuSection = {
  id: string;
  name: string;
  sort_order: number;
  presentation_component_key?: string;
};

export type PublicMenuCategory = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  section_id: string | null;
  section_name: string | null;
  presentation_component_key?: string;
  /** When set, the menu uses ItemCardFromLayout with this definition instead of component_key. */
  presentation_layout_definition?: {
    canvasHeight?: number;
    zoneOrder: string[];
    zoneWidths?: Record<string, string>;
    zoneHeights?: Record<string, number>;
    rowSpacingPx?: number;
    contentPaddingPx?: number;
    contentRowGapPx?: number;
    nameFontSize?: string;
    nameFontWeight?: string;
    priceFontSize?: string;
    priceLineHeight?: string;
  } | null;
  items: PublicMenuItem[];
};

export type PublicArticleType = {
  id: string;
  name: string;
  icon_code: string;
};

export type PublicMenuItem = {
  id: string;
  menu_name: string | null;
  menu_description: string | null;
  menu_price: number | null;
  image_path: string | null;
  image_url: string | null;
  image_base_path: string | null;
  is_featured: boolean;
  prep_minutes: number | null;
  sort_order: number;
  is_promotion: boolean;
  price_old: number | null;
  take_away: boolean;
  menu_ingredients: string | null;
  article_type: PublicArticleType | null;
  allergens: { code: string; name?: string; severity?: number; name_i18n?: Record<string, string> }[];
};

export type PublicMenuStoreSettings = {
  logo_url?: string;
  currency_code?: string;
  store_display_name?: string;
  primary_color?: string;
  menu_template_key?: string;
  hero_text?: string;
  footer_text?: string;
  contact_url?: string;
  privacy_url?: string;
  reservation_url?: string;
  /** Section title appearance (applies to all sections). */
  section_title_align?: string;
  section_title_margin_bottom?: string;
  section_title_padding_top?: string;
  section_title_color?: string;
  /** Category title appearance (applies to all categories). */
  category_title_align?: string;
  category_title_margin_bottom?: string;
  category_title_padding_top?: string;
  category_title_indent_px?: string;
  category_title_color?: string;
  /** Label do bloco de destaques no topo do menu (ex.: Escolhas do Chef). */
  featured_section_label?: string;
  /** Chave do modelo de apresentação de destaques (ex.: modelo-destaque-1). */
  featured_template_key?: string;
  /** Método de leitura de imagens: "storage" | "url" | "legacy_path". Default: "storage". */
  image_source?: string;
};

/** Layout definition for featured carousel cards (same shape as presentation-templates LayoutDefinition). */
export type PublicMenuFeaturedLayoutDefinition = {
  canvasHeight?: number;
  zoneOrder: string[];
  zoneWidths?: Record<string, string>;
  zoneHeights?: Record<string, number>;
  rowSpacingPx?: number;
  contentPaddingPx?: number;
  contentRowGapPx?: number;
  nameFontSize?: string;
  nameFontWeight?: string;
  priceFontSize?: string;
  priceLineHeight?: string;
} | null;

export type PublicMenuPayload = {
  store_id: string | null;
  store_name: string | null;
  store_settings?: PublicMenuStoreSettings;
  /** Layout do template de destaques selecionado pela loja (para o carrossel). */
  featured_layout_definition?: PublicMenuFeaturedLayoutDefinition;
  sections: PublicMenuSection[];
  categories: PublicMenuCategory[];
  error?: string;
};

export async function getPublicMenuByHostname(
  host: string
): Promise<PublicMenuPayload> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("public_menu_by_hostname", {
      host: host ?? "",
    });
    if (error) {
      return {
        store_id: null,
        store_name: null,
        store_settings: undefined,
        sections: [],
        categories: [],
        error: error.message,
      };
    }
    if (data?.categories) {
      return data as PublicMenuPayload;
    }
    return (data as PublicMenuPayload) ?? { store_id: null, store_name: null, store_settings: undefined, sections: [], categories: [] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Configuração Supabase em falta";
    return { store_id: null, store_name: null, store_settings: undefined, sections: [], categories: [], error: msg };
  }
}
