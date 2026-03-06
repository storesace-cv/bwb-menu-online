import type { ComponentType } from "react";
import type { PublicMenuPayload } from "@/lib/supabase";
import { BwbBrancoTemplate, BWB_BRANCO_KEY } from "@/components/public-menu/bwb-branco-template";

export const DEFAULT_MENU_TEMPLATE_KEY = BWB_BRANCO_KEY;

type MenuTemplateComponent = ComponentType<{ menu: PublicMenuPayload }>;

const registry: Record<string, MenuTemplateComponent> = {
  [BWB_BRANCO_KEY]: BwbBrancoTemplate,
};

/**
 * Returns the menu template component for the given key.
 * Fallback: bwb-branco if key is missing or not in registry.
 */
export function getTemplateComponent(key?: string | null): MenuTemplateComponent {
  const k = (key?.trim() || DEFAULT_MENU_TEMPLATE_KEY).toLowerCase();
  return registry[k] ?? BwbBrancoTemplate;
}

export function getTemplateKeys(): string[] {
  return Object.keys(registry);
}
