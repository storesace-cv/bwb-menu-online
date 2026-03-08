import type { ComponentType } from "react";
import type { PublicMenuItem } from "@/lib/supabase";
import { ItemCardRestaurante1 } from "@/components/public-menu/item-card-restaurante-1";

export const DEFAULT_PRESENTATION_KEY = "modelo-restaurante-1";

export type PresentationCardProps = {
  item: PublicMenuItem;
  currencyCode?: string;
};

type PresentationCardComponent = ComponentType<PresentationCardProps>;

const registry: Record<string, PresentationCardComponent> = {
  [DEFAULT_PRESENTATION_KEY]: ItemCardRestaurante1,
};

/**
 * Returns the card component for the given presentation key.
 * Fallback: modelo-restaurante-1 if key is missing or not in registry.
 */
export function getPresentationCardComponent(key?: string | null): PresentationCardComponent {
  const k = (key?.trim() || DEFAULT_PRESENTATION_KEY).toLowerCase();
  return registry[k] ?? ItemCardRestaurante1;
}

export function getPresentationComponentKeys(): string[] {
  return Object.keys(registry);
}
