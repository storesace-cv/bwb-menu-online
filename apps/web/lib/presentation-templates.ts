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

/** Largura da zona no layout: linha inteira, metade (50%) ou um quarto (25%). Consecutivos half/quarter ficam na mesma linha. */
export type ZoneWidth = "full" | "half" | "quarter";

export interface LayoutDefinition {
  /** Altura mínima do card em px. Omitir ou 0 = altura mínima automática (conteúdo). */
  canvasHeight?: number;
  zoneOrder: string[];
  /** Opcional: largura por tipo de zona. Omitido = "full". Consecutivos "half" formam uma linha de 2; "quarter" até 4. */
  zoneWidths?: Record<string, ZoneWidth>;
  /** Espaçamento em px entre linhas de conteúdo do card; default 8. */
  rowSpacingPx?: number;
  /** Opcional: altura em px por tipo de zona. Omitido = DEFAULT_ZONE_HEIGHTS[type]. */
  zoneHeights?: Record<string, number>;
}

/** Alturas por defeito por zona (px), para UI e card público quando zoneHeights não define o tipo. */
export const DEFAULT_ZONE_HEIGHTS: Record<LayoutZoneType, number> = {
  image: 240,
  icons: 28,
  name: 32,
  description: 48,
  ingredients: 40,
  prep_time: 32,
  allergens: 32,
  price_old: 40,
  price: 40,
};

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
