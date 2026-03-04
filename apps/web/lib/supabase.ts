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

export type PublicMenuCategory = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  items: PublicMenuItem[];
};

export type PublicMenuItem = {
  id: string;
  menu_name: string | null;
  menu_description: string | null;
  menu_price: number | null;
  image_path: string | null;
  is_featured: boolean;
  prep_minutes: number | null;
  sort_order: number;
  allergens: { code: string; name: string }[];
};

export type PublicMenuPayload = {
  store_id: string | null;
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
        categories: [],
        error: error.message,
      };
    }
    if (data?.categories) {
      return data as PublicMenuPayload;
    }
    return (data as PublicMenuPayload) ?? { store_id: null, categories: [] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Configuração Supabase em falta";
    return { store_id: null, categories: [], error: msg };
  }
}
