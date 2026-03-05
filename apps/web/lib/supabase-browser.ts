import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para uso em Client Components (browser).
 * Guarda a sessão em cookies para o servidor poder ler em Server Components
 * e no layout (createServerClient em supabase-server.ts).
 * Usar em login, change-password e qualquer componente que faça auth no browser.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios.");
  }
  return createBrowserClient(url, key);
}
