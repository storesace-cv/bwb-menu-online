import type { ComponentType } from "react";
import type { PublicMenuItem } from "@/lib/supabase";
import { ItemCardRestaurante1 } from "@/components/public-menu/item-card-restaurante-1";

export const DEFAULT_PRESENTATION_KEY = "modelo-restaurante-1";

/** Zone types for layout-defined cards (order + visibility only). */
export const LAYOUT_ZONE_TYPES = [
  "image",
  "icons",
  "name",
  "description",
  "ingredients",
  "prep_time",
  "allergens",
  "price_old",
  "price",
] as const;

export type LayoutZoneType = (typeof LAYOUT_ZONE_TYPES)[number];

export interface LayoutDefinition {
  canvasHeight?: number;
  zoneOrder: string[];
}

export const DEFAULT_CANVAS_HEIGHT = 560;

/** Default zone order matching Modelo Restaurante 1. */
export const DEFAULT_LAYOUT_ZONE_ORDER: LayoutZoneType[] = [
  "image",
  "icons",
  "name",
  "description",
  "ingredients",
  "prep_time",
  "allergens",
  "price_old",
  "price",
];

export const LAYOUT_ZONE_LABELS: Record<LayoutZoneType, string> = {
  image: "Imagem",
  icons: "Ícones",
  name: "Nome",
  description: "Descrição",
  ingredients: "Ingredientes",
  prep_time: "Tempo de preparação",
  allergens: "Alergénios",
  price_old: "Preço antigo",
  price: "Preço",
};

export function getDefaultLayoutDefinition(): LayoutDefinition {
  return {
    canvasHeight: DEFAULT_CANVAS_HEIGHT,
    zoneOrder: [...DEFAULT_LAYOUT_ZONE_ORDER],
  };
}

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
