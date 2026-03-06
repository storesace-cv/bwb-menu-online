"use client";

import type { PublicMenuPayload } from "@/lib/supabase";
import { getTemplateComponent } from "@/lib/menu-templates";

/**
 * Renders the public menu using the template selected in store_settings.menu_template_key.
 * Fallback: bwb-branco.
 */
export function PublicMenuClient({ menu }: { menu: PublicMenuPayload }) {
  const Template = getTemplateComponent(menu.store_settings?.menu_template_key);
  return <Template menu={menu} />;
}
