import type { ComponentType } from "react";
import type { PublicMenuItem } from "@/lib/supabase";
import { ItemCardRestaurante1 } from "@/components/public-menu/item-card-restaurante-1";
import { ItemCardDestaque1 } from "@/components/public-menu/item-card-destaque-1";

export const DEFAULT_PRESENTATION_KEY = "modelo-restaurante-1";
export const DEFAULT_FEATURED_PRESENTATION_KEY = "modelo-destaque-1";

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

/** Tamanho de fonte para nome e preço no card. */
export type ContentFontSize = "sm" | "base" | "lg";
/** Peso de fonte para o nome do artigo. */
export type ContentFontWeight = "semibold" | "bold";
/** Altura de linha para o preço. */
export type ContentLineHeight = "none" | "normal";

export interface LayoutDefinition {
  /** Altura mínima do card em px. Omitir ou 0 = altura mínima automática (conteúdo). */
  canvasHeight?: number;
  zoneOrder: string[];
  /** Opcional: largura por tipo de zona. Omitido = "full". Consecutivos "half" formam uma linha de 2; "quarter" até 4. */
  zoneWidths?: Record<string, ZoneWidth>;
  /** Espaçamento em px entre linhas de conteúdo do card; default 8. */
  rowSpacingPx?: number;
  /** Opcional: altura mínima por tipo de zona. 0 = automática (conteúdo); > 0 = altura mínima em px. Omitido = DEFAULT_ZONE_HEIGHTS[type]. */
  zoneHeights?: Record<string, number>;
  /** Padding interno (px) do bloco de conteúdo do card; 4–24; default 12. */
  contentPaddingPx?: number;
  /** Gap (px) entre colunas na mesma linha; 2–24; default 16. */
  contentRowGapPx?: number;
  /** Tamanho da fonte do nome do artigo; default "lg". */
  nameFontSize?: ContentFontSize;
  /** Peso da fonte do nome; default "bold". */
  nameFontWeight?: ContentFontWeight;
  /** Tamanho da fonte do preço; default "base". */
  priceFontSize?: ContentFontSize;
  /** Altura de linha do preço ("none" = leading-none); default "normal". */
  priceLineHeight?: ContentLineHeight;
}

/** Presets de padding interno (px) para a UI. */
export const CONTENT_PADDING_PRESETS = [4, 6, 8, 12, 16, 20, 24] as const;
/** Presets de gap entre colunas (px) para a UI. */
export const CONTENT_ROW_GAP_PRESETS = [2, 4, 8, 16, 24] as const;
export const DEFAULT_CONTENT_PADDING_PX = 12;
export const DEFAULT_CONTENT_ROW_GAP_PX = 16;

export const CONTENT_FONT_SIZE_LABELS: Record<ContentFontSize, string> = {
  sm: "Pequeno",
  base: "Normal",
  lg: "Grande",
};
export const CONTENT_FONT_WEIGHT_LABELS: Record<ContentFontWeight, string> = {
  semibold: "Semibold",
  bold: "Bold",
};
export const CONTENT_LINE_HEIGHT_LABELS: Record<ContentLineHeight, string> = {
  none: "Nenhum",
  normal: "Normal",
};

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
  imageSource?: string;
};

export type FeaturedCardProps = {
  item: PublicMenuItem;
  currencyCode?: string;
  categoryName?: string;
  imageSource?: string;
  layoutDefinition?: LayoutDefinition | null;
};

type PresentationCardComponent = ComponentType<PresentationCardProps>;
type FeaturedCardComponent = ComponentType<FeaturedCardProps>;

const registry: Record<string, PresentationCardComponent> = {
  [DEFAULT_PRESENTATION_KEY]: ItemCardRestaurante1,
};

const featuredRegistry: Record<string, FeaturedCardComponent> = {
  [DEFAULT_FEATURED_PRESENTATION_KEY]: ItemCardDestaque1,
};

/**
 * Returns the card component for the given presentation key.
 * Fallback: modelo-restaurante-1 if key is missing or not in registry.
 */
export function getPresentationCardComponent(key?: string | null): PresentationCardComponent {
  const k = (key?.trim() || DEFAULT_PRESENTATION_KEY).toLowerCase();
  return registry[k] ?? ItemCardRestaurante1;
}

/**
 * Returns the featured carousel card component for the given key.
 * Fallback: modelo-destaque-1 if key is missing or not in registry.
 */
export function getFeaturedPresentationCardComponent(key?: string | null): FeaturedCardComponent {
  const k = (key?.trim() || DEFAULT_FEATURED_PRESENTATION_KEY).toLowerCase();
  return featuredRegistry[k] ?? ItemCardDestaque1;
}

export function getPresentationComponentKeys(): string[] {
  return Object.keys(registry);
}

export function getFeaturedPresentationComponentKeys(): string[] {
  return Object.keys(featuredRegistry);
}
