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
};

export type PublicMenuCategory = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  section_id: string | null;
  section_name: string | null;
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
  is_featured: boolean;
  prep_minutes: number | null;
  sort_order: number;
  is_promotion: boolean;
  price_old: number | null;
  take_away: boolean;
  menu_ingredients: string | null;
  article_type: PublicArticleType | null;
  allergens: { code: string; name: string }[];
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
};

export type PublicMenuPayload = {
  store_id: string | null;
  store_name: string | null;
  store_settings?: PublicMenuStoreSettings;
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
