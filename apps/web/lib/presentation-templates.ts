import type { ComponentType } from "react";
import type { PublicMenuItem } from "@/lib/supabase";
import { ItemCardRestaurante1 } from "@/components/public-menu/item-card-restaurante-1";
import { ItemCardRestaurante2 } from "@/components/public-menu/item-card-restaurante-2";
import { ItemCardDestaque1 } from "@/components/public-menu/item-card-destaque-1";

export const DEFAULT_PRESENTATION_KEY = "modelo-restaurante-1";
export const DEFAULT_FEATURED_PRESENTATION_KEY = "modelo-destaque-1";

/** Zone types for layout-defined cards (order + visibility only). */
export const LAYOUT_ZONE_TYPES = [
  "image",
  "icons",
  "name",
  "daily_name",
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

/** Alinhamento do conteúdo da zona no card. */
export type ZoneAlignment = "left" | "center" | "right";

/** Tamanho de fonte para nome e preço no card. */
export type ContentFontSize = "sm" | "base" | "lg";
/** Peso de fonte para o nome do artigo. */
export type ContentFontWeight = "semibold" | "bold";
/** Altura de linha para o preço. */
export type ContentLineHeight = "none" | "normal";

/** object-fit CSS para a zona imagem (macro-zonas). cover_1_1 = quadrado (lado = largura da zona), imagem cover centrada. */
export type MacroImageObjectFit = "cover" | "contain" | "fill" | "none" | "scale-down" | "cover_1_1";

/**
 * Duas macro-zonas: imagem + conteúdo (demais campos).
 * - direction horizontal: esquerda/direita conforme imageFirst.
 * - direction vertical: cima/baixo conforme imageFirst.
 * - splitPercent: % do eixo principal da zona imagem (resto = conteúdo).
 */
export interface MacroZonesConfig {
  direction: "vertical" | "horizontal";
  /** 10–90: percentagem do eixo principal para a zona imagem */
  splitPercent: number;
  /** true: imagem esquerda (horizontal) ou cima (vertical); false: direita / baixo */
  imageFirst: boolean;
  imageObjectFit: MacroImageObjectFit;
  /** auto: alturas naturais; match_reference: ambas zonas igualam à referência em altura (horizontal) */
  heightMode: "auto" | "match_reference";
  /** Quem define altura comum quando heightMode = match_reference */
  heightReference: "image" | "content";
  /** Quando true, aplica scale proporcional ao texto da zona de conteúdo para caber na altura disponível (horizontal) */
  contentScaleToFit?: boolean;
}

export const DEFAULT_MACRO_ZONES: MacroZonesConfig = {
  direction: "horizontal",
  splitPercent: 40,
  imageFirst: true,
  imageObjectFit: "cover",
  heightMode: "auto",
  heightReference: "image",
};

export const MACRO_IMAGE_OBJECT_FIT_LABELS: Record<MacroImageObjectFit, string> = {
  cover: "Cover (preencher)",
  contain: "Contain (integral)",
  fill: "Esticar",
  none: "Natural",
  "scale-down": "Scale down",
  cover_1_1: "Cover 1:1",
};

export function normalizeMacroZones(m: Partial<MacroZonesConfig> | null | undefined): MacroZonesConfig | null {
  if (m == null || typeof m !== "object") return null;
  const direction = m.direction === "vertical" ? "vertical" : "horizontal";
  let split = Math.round(Number(m.splitPercent));
  if (!Number.isFinite(split)) split = DEFAULT_MACRO_ZONES.splitPercent;
  split = Math.max(10, Math.min(90, split));
  const imageFirst = Boolean(m.imageFirst);
  const fits: MacroImageObjectFit[] = ["cover", "contain", "fill", "none", "scale-down", "cover_1_1"];
  const imageObjectFit = fits.includes(m.imageObjectFit as MacroImageObjectFit)
    ? (m.imageObjectFit as MacroImageObjectFit)
    : "cover";
  const heightMode = m.heightMode === "match_reference" ? "match_reference" : "auto";
  const heightReference = m.heightReference === "content" ? "content" : "image";
  const contentScaleToFit = Boolean(m.contentScaleToFit);
  return {
    direction,
    splitPercent: split,
    imageFirst,
    imageObjectFit,
    heightMode,
    heightReference,
    contentScaleToFit,
  };
}

export const OBJECT_FIT_TO_CLASS: Record<MacroImageObjectFit, string> = {
  cover: "object-cover",
  contain: "object-contain",
  fill: "object-fill",
  none: "object-none",
  "scale-down": "object-scale-down",
  cover_1_1: "object-cover",
};

export interface LayoutDefinition {
  /** Altura mínima do card em px. Omitir ou 0 = altura mínima automática (conteúdo). */
  canvasHeight?: number;
  zoneOrder: string[];
  /** Opcional: largura por tipo de zona. Omitido = "full". Consecutivos "half" formam uma linha de 2; "quarter" até 4. */
  zoneWidths?: Record<string, ZoneWidth>;
  /** Opcional: largura em percentagem 1–100 por tipo de zona. Quando definido, tem prioridade sobre zoneWidths. */
  zoneWidthPercent?: Record<string, number>;
  /** Opcional: número de linha (1-based) por tipo de zona; define explicitamente a que linha pertence cada zona. */
  zoneLineNumbers?: Record<string, number>;
  /** Espaçamento em px entre linhas de conteúdo do card; default 8. */
  rowSpacingPx?: number;
  /** Opcional: altura mínima por tipo de zona. 0 = automática (conteúdo); > 0 = altura mínima em px. Omitido = DEFAULT_ZONE_HEIGHTS[type]. */
  zoneHeights?: Record<string, number>;
  /** Padding interno (px) do bloco de conteúdo do card; 4–24; default 12. Ignorado se contentPaddingSides estiver definido. */
  contentPaddingPx?: number;
  /** Padding assimétrico (px) por lado; quando definido, substitui contentPaddingPx. */
  contentPaddingSides?: { top: number; right: number; bottom: number; left: number };
  /** Tamanho dos ícones (px) nas zonas prep_time e icons; omitido = 18 e 22. */
  zoneIconSizes?: { prep_time?: number; icons?: number };
  /** line-height do nome (ex.: 1.15); omitido = leading-snug do editor. */
  nameLineHeight?: number;
  /** padding-right (px) só na zona preço; omitido = 0. */
  pricePaddingRightPx?: number;
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
  /** Alinhamento por tipo de zona (esquerda, centro, direita). Omitido = "left". */
  zoneAlignment?: Record<string, ZoneAlignment>;
  /** Se definido e zoneOrder contém "image": canvas em duas macro-zonas (imagem + restantes campos). Omitido = layout legacy. */
  macroZones?: MacroZonesConfig;
}

/** Presets de padding interno (px) para a UI. 0 = sem padding. */
export const CONTENT_PADDING_PRESETS = [0, 4, 6, 8, 12, 16, 20, 24] as const;
/** Presets de gap entre colunas (px) para a UI. 0 = sem gap. */
export const CONTENT_ROW_GAP_PRESETS = [0, 2, 4, 8, 16, 24] as const;
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
  daily_name: 28,
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
  daily_name: "Nome do dia",
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

const ZONE_WIDTH_TO_PERCENT: Record<ZoneWidth, number> = {
  full: 100,
  half: 50,
  quarter: 25,
};

/**
 * Devolve a largura efectiva da zona em percentagem (1–100).
 * Prioridade: zoneWidthPercent[type] se em 1–100; senão zoneWidths[type] mapeado (full→100, half→50, quarter→25); fallback por tipo (price/price_old→50, resto→100).
 */
export function parseZoneWidthPercent(
  type: string,
  zoneWidthPercent?: Record<string, number> | null,
  zoneWidths?: Record<string, ZoneWidth> | null
): number {
  const p = zoneWidthPercent?.[type];
  if (typeof p === "number" && p >= 1 && p <= 100) return Math.round(p);
  const w = zoneWidths?.[type];
  if (w && ZONE_WIDTH_TO_PERCENT[w] != null) return ZONE_WIDTH_TO_PERCENT[w];
  return type === "price_old" || type === "price" ? 50 : 100;
}

/**
 * Agrupa zoneOrder em linhas pelo número de linha (zoneLineNumbers).
 * Se zoneLineNumbers existir e tiver pelo menos uma entrada, devolve linhas ordenadas por número de linha e depois por ordem em zoneOrder; senão devolve null.
 * Dentro da mesma linha, a ordem é a de zoneOrder: primeiro na lista = esquerda no menu.
 */
export function groupZonesIntoRowsByLineNumber(
  zoneOrder: string[],
  zoneLineNumbers?: Record<string, number> | null
): string[][] | null {
  if (!zoneLineNumbers || Object.keys(zoneLineNumbers).length === 0) return null;
  const orderIndex = new Map(zoneOrder.map((z, i) => [z, i]));
  const withLine = zoneOrder
    .map((type) => ({ type, line: zoneLineNumbers[type] ?? 1, index: orderIndex.get(type) ?? 0 }))
    .sort((a, b) => a.line - b.line || a.index - b.index);
  const rows: string[][] = [];
  let currentLine = -1;
  for (const { type, line } of withLine) {
    if (line !== currentLine) {
      rows.push([]);
      currentLine = line;
    }
    rows[rows.length - 1].push(type);
  }
  return rows;
}

/**
 * Agrupa zoneOrder em linhas "a encher": soma percentagens até ≥100% (ou fim da lista). Cada linha é um array de tipos.
 */
export function groupZonesIntoRowsByWidthPercent(
  zoneOrder: string[],
  zoneWidthPercent?: Record<string, number> | null,
  zoneWidths?: Record<string, ZoneWidth> | null
): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let sum = 0;
  for (const type of zoneOrder) {
    const p = parseZoneWidthPercent(type, zoneWidthPercent, zoneWidths);
    if (current.length > 0 && sum + p > 100) {
      rows.push(current);
      current = [];
      sum = 0;
    }
    current.push(type);
    sum += p;
  }
  if (current.length > 0) rows.push(current);
  return rows;
}

export type PresentationCardProps = {
  item: PublicMenuItem;
  currencyCode?: string;
  imageSource?: string;
  sampleImageUsage?: string;
  /** Quando true, o card renderiza 8 zonas como filhos para subgrid (alinhamento em 2 colunas). */
  inRowCards?: boolean;
};

export type FeaturedCardProps = {
  item: PublicMenuItem;
  currencyCode?: string;
  categoryName?: string;
  imageSource?: string;
  sampleImageUsage?: string;
  layoutDefinition?: LayoutDefinition | null;
  /** Quando definido (ex. "100%"), usa-se no article em vez do minHeight do layout. Útil no carrossel mobile. */
  articleMinHeight?: string | number;
};

type PresentationCardComponent = ComponentType<PresentationCardProps>;
type FeaturedCardComponent = ComponentType<FeaturedCardProps>;

const registry: Record<string, PresentationCardComponent> = {
  [DEFAULT_PRESENTATION_KEY]: ItemCardRestaurante1,
  "modelo-restaurante-2": ItemCardRestaurante2,
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
