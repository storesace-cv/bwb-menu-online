import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { formatPrice } from "@/lib/format-price";

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
  /** Cor de fundo do bloco da secção no menu público. */
  background_color?: string | null;
  /** CSS de fundo (ex.: linear-gradient). Quando definido, substitui background_color. */
  background_css?: string | null;
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
  /** Preço atual pré-formatado (valor + moeda) para evitar hidratação #418/#423. */
  menu_price_display?: string;
  /** Preço antigo pré-formatado (valor + moeda). */
  price_old_display?: string;
};

export type PublicMenuStoreSettings = {
  logo_url?: string;
  /** Cor do fill do logótipo principal (SVG). Opcional. */
  logo_fill_color?: string;
  /** Cor do stroke do logótipo principal (SVG). Opcional. */
  logo_stroke_color?: string;
  currency_code?: string;
  store_display_name?: string;
  primary_color?: string;
  menu_template_key?: string;
  hero_text?: string;
  /** Cor de fundo do hero (menu público). Opcional. */
  hero_background_color?: string;
  /** CSS de fundo do hero (ex.: linear-gradient). Quando definido, substitui hero_background_color. */
  hero_background_css?: string;
  footer_text?: string;
  /** Rodapé configurável (menu público). */
  footer_logo_url?: string;
  /** Cor do fill do logo do rodapé (SVG). Opcional. */
  footer_logo_fill_color?: string;
  /** Cor do stroke do logo do rodapé (SVG). Opcional. */
  footer_logo_stroke_color?: string;
  footer_address?: string;
  footer_email?: string;
  footer_phone?: string;
  footer_background_color?: string;
  /** CSS para background do rodapé (ex.: linear-gradient). Quando definido, sobrepõe footer_background_color. */
  footer_background_css?: string;
  /** Cor do texto do rodapé (hex ou CSS). */
  footer_text_color?: string;
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

/** Payload da carga inicial: inclui featured_items no topo (todos os is_featured da loja). */
export type PublicMenuInitialPayload = PublicMenuPayload & {
  featured_items?: { item: PublicMenuItem; categoryName: string }[];
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
      const payload = data as PublicMenuPayload;
      const currencyCode = payload.store_settings?.currency_code ?? "€";
      const categories = payload.categories.map((category) => ({
        ...category,
        items: category.items.map((item) => {
          const enriched = { ...item };
          if (item.menu_price != null) {
            enriched.menu_price_display = formatPrice(item.menu_price, currencyCode);
          }
          if (item.price_old != null) {
            enriched.price_old_display = formatPrice(item.price_old, currencyCode);
          }
          return enriched;
        }),
      }));
      return { ...payload, categories };
    }
    return (data as PublicMenuPayload) ?? { store_id: null, store_name: null, store_settings: undefined, sections: [], categories: [] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Configuração Supabase em falta";
    return { store_id: null, store_name: null, store_settings: undefined, sections: [], categories: [], error: msg };
  }
}

function enrichMenuItems(items: PublicMenuItem[], currencyCode: string): PublicMenuItem[] {
  return items.map((item) => {
    const enriched = { ...item };
    if (item.menu_price != null) {
      enriched.menu_price_display = formatPrice(item.menu_price, currencyCode);
    }
    if (item.price_old != null) {
      enriched.price_old_display = formatPrice(item.price_old, currencyCode);
    }
    return enriched;
  });
}

export async function getPublicMenuInitialByHostname(
  host: string
): Promise<PublicMenuInitialPayload> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("public_menu_initial_by_hostname", {
      host: host ?? "",
    });
    if (error) {
      return {
        store_id: null,
        store_name: null,
        store_settings: undefined,
        sections: [],
        categories: [],
        featured_items: [],
        error: error.message,
      };
    }
    const raw = data as PublicMenuInitialPayload;
    const currencyCode = raw.store_settings?.currency_code ?? "€";
    const categories = (raw.categories ?? []).map((category) => ({
      ...category,
      items: enrichMenuItems(category.items ?? [], currencyCode),
    }));
    const featured_items = (raw.featured_items ?? []).map(({ item, categoryName }) => ({
      item: enrichMenuItems([item], currencyCode)[0],
      categoryName,
    }));
    return {
      ...raw,
      categories,
      featured_items,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Configuração Supabase em falta";
    return {
      store_id: null,
      store_name: null,
      store_settings: undefined,
      sections: [],
      categories: [],
      featured_items: [],
      error: msg,
    };
  }
}

/** Categorias (com items) de uma secção; para uso futuro na alternância de secções (lazy load). Passar currencyCode (ex.: menu.store_settings?.currency_code) para enriquecer preços. */
export async function getPublicMenuSectionCategories(
  host: string,
  sectionId: string,
  currencyCode?: string
): Promise<PublicMenuCategory[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("public_menu_section_categories_by_hostname", {
      host: host ?? "",
      p_section_id: sectionId,
    });
    if (error) return [];
    const categories = (data ?? []) as PublicMenuCategory[];
    const code = currencyCode ?? "€";
    return categories.map((category) => ({
      ...category,
      items: enrichMenuItems(category.items ?? [], code),
    }));
  } catch {
    return [];
  }
}
