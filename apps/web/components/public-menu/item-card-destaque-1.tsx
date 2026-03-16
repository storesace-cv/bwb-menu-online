"use client";

import { useState, useEffect, useMemo } from "react";
import type { PublicMenuItem } from "@/lib/supabase";
import type {
  LayoutDefinition,
  ZoneWidth,
  ContentFontSize,
  ContentFontWeight,
  ContentLineHeight,
} from "@/lib/presentation-templates";
import type { LayoutZoneType } from "@/lib/presentation-templates";
import {
  DEFAULT_ZONE_HEIGHTS,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CONTENT_PADDING_PX,
  DEFAULT_CONTENT_ROW_GAP_PX as DEFAULT_ROW_GAP_PX,
  parseZoneWidthPercent,
  groupZonesIntoRowsByLineNumber,
  groupZonesIntoRowsByWidthPercent,
} from "@/lib/presentation-templates";
import { formatPrice } from "@/lib/format-price";
import { MenuIcon } from "../menu-icons";
import { getImageSrc, FALLBACK_IMAGE } from "./item-card-restaurante-1";

function getAllergenLabel(a: { name_i18n?: Record<string, string>; code: string; name?: string }): string {
  const i18n = a.name_i18n;
  if (i18n && typeof i18n === "object") {
    if (i18n.pt) return i18n.pt;
    if (i18n.en) return i18n.en;
  }
  if (a.name) return a.name;
  return a.code;
}

const SEVERITY_CLASSES: Record<number, string> = {
  1: "bg-green-600/20 text-green-800 border border-green-500/40",
  2: "bg-lime-600/20 text-lime-800 border border-lime-500/40",
  3: "bg-orange-600/20 text-orange-800 border border-orange-500/40",
  4: "bg-red-600/20 text-red-800 border border-red-500/40",
  5: "bg-red-700/25 text-red-900 border border-red-600/50",
};

/** Nos Destaques, texto dos alergénios a branco sobre o overlay. */
const ALLERGEN_BADGE_DESTAQUE = "text-xs px-1.5 py-0.5 rounded text-white bg-white/15 border border-white/25";

const ZONE_HEIGHT_MIN = 12;
const ZONE_HEIGHT_MAX = 600;
const CONTENT_PADDING_MIN = 0;
const CONTENT_PADDING_MAX = 24;
const CONTENT_ROW_GAP_MIN = 0;
const CONTENT_ROW_GAP_MAX = 24;

const FONT_SIZE_CLASSES: Record<ContentFontSize, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};
const FONT_WEIGHT_CLASSES: Record<ContentFontWeight, string> = {
  semibold: "font-semibold",
  bold: "font-bold",
};
const LINE_HEIGHT_CLASSES: Record<ContentLineHeight, string> = {
  none: "leading-none",
  normal: "",
};

function getEffectiveZoneHeight(type: string, zoneHeights: Record<string, number> | undefined): number {
  if (zoneHeights?.[type] != null && Number.isFinite(zoneHeights[type])) {
    const n = Math.round(Number(zoneHeights[type]));
    if (n === 0) return 0;
    if (n >= ZONE_HEIGHT_MIN && n <= ZONE_HEIGHT_MAX) return n;
  }
  const d = DEFAULT_ZONE_HEIGHTS[type as LayoutZoneType];
  return typeof d === "number" ? d : 32;
}

/** Card de destaque "Modelo Destaque 1" — imagem de fundo em cover + overlay em gradiente; conteúdo segue layoutDefinition quando fornecido (ordem e altura do admin). */
export function ItemCardDestaque1({
  item,
  categoryName,
  currencyCode,
  imageSource,
  sampleImageUsage,
  layoutDefinition,
  articleMinHeight: articleMinHeightProp,
}: {
  item: PublicMenuItem;
  categoryName?: string;
  currencyCode?: string;
  imageSource?: string;
  sampleImageUsage?: string;
  layoutDefinition?: LayoutDefinition | null;
  articleMinHeight?: string | number;
}) {
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const imageSrc = getImageSrc(item, imageSource, sampleImageUsage);
  const [effectiveSrc, setEffectiveSrc] = useState(imageSrc);
  useEffect(() => {
    setEffectiveSrc(imageSrc);
  }, [imageSrc]);
  const hasIngredients = item.menu_ingredients != null && item.menu_ingredients.trim() !== "";
  const noDefaultSample =
    sampleImageUsage === "none" || sampleImageUsage === "category_only" || sampleImageUsage === "article_only";
  const handleImageError = () => setEffectiveSrc(noDefaultSample ? "" : FALLBACK_IMAGE);

  const useLayout =
    layoutDefinition != null &&
    Array.isArray(layoutDefinition.zoneOrder) &&
    layoutDefinition.zoneOrder.filter((z) => z !== "image").length > 0;

  const contentZoneOrder = useMemo(
    () => (useLayout ? layoutDefinition!.zoneOrder.filter((z) => z !== "image") : []),
    [useLayout, layoutDefinition]
  );
  const zoneRows = useMemo(() => {
    if (!useLayout || !layoutDefinition) return [];
    const byLine = groupZonesIntoRowsByLineNumber(contentZoneOrder, layoutDefinition.zoneLineNumbers);
    if (byLine != null && byLine.length > 0) return byLine;
    if (
      (layoutDefinition.zoneWidthPercent && Object.keys(layoutDefinition.zoneWidthPercent).length > 0) ||
      (layoutDefinition.zoneWidths && Object.keys(layoutDefinition.zoneWidths).length > 0)
    ) {
      return groupZonesIntoRowsByWidthPercent(
        contentZoneOrder,
        layoutDefinition.zoneWidthPercent,
        layoutDefinition.zoneWidths
      );
    }
    const defaultZoneWidthPercent: Record<string, number> = {};
    if (contentZoneOrder.includes("name")) defaultZoneWidthPercent["name"] = 75;
    if (contentZoneOrder.includes("price")) defaultZoneWidthPercent["price"] = 25;
    if (contentZoneOrder.includes("price_old")) defaultZoneWidthPercent["price_old"] = 25;
    return groupZonesIntoRowsByWidthPercent(contentZoneOrder, defaultZoneWidthPercent, undefined);
  }, [useLayout, contentZoneOrder, layoutDefinition]);
  const minHeightFromLayout =
    useLayout &&
    layoutDefinition!.canvasHeight != null &&
    Number.isFinite(layoutDefinition!.canvasHeight) &&
    layoutDefinition!.canvasHeight > 0
      ? layoutDefinition!.canvasHeight
      : DEFAULT_CANVAS_HEIGHT;
  const minHeight = articleMinHeightProp != null ? articleMinHeightProp : minHeightFromLayout;
  const contentPaddingPx =
    useLayout && layoutDefinition!.contentPaddingPx != null && Number.isFinite(layoutDefinition!.contentPaddingPx)
      ? Math.max(CONTENT_PADDING_MIN, Math.min(CONTENT_PADDING_MAX, Math.round(Number(layoutDefinition!.contentPaddingPx))))
      : DEFAULT_CONTENT_PADDING_PX;
  const rowSpacingPx =
    useLayout && layoutDefinition!.rowSpacingPx != null && layoutDefinition!.rowSpacingPx >= 0 && layoutDefinition!.rowSpacingPx <= 48
      ? layoutDefinition!.rowSpacingPx
      : 8;
  const contentRowGapPx =
    useLayout && layoutDefinition!.contentRowGapPx != null && Number.isFinite(layoutDefinition!.contentRowGapPx)
      ? Math.max(CONTENT_ROW_GAP_MIN, Math.min(CONTENT_ROW_GAP_MAX, Math.round(Number(layoutDefinition!.contentRowGapPx))))
      : DEFAULT_ROW_GAP_PX;
  const zoneHeights = useLayout ? layoutDefinition!.zoneHeights : undefined;
  const nameFontSize: ContentFontSize =
    useLayout && (layoutDefinition!.nameFontSize === "sm" || layoutDefinition!.nameFontSize === "base" || layoutDefinition!.nameFontSize === "lg")
      ? layoutDefinition!.nameFontSize
      : "lg";
  const nameFontWeight: ContentFontWeight =
    useLayout && (layoutDefinition!.nameFontWeight === "semibold" || layoutDefinition!.nameFontWeight === "bold")
      ? layoutDefinition!.nameFontWeight
      : "bold";
  const priceFontSize: ContentFontSize =
    useLayout && (layoutDefinition!.priceFontSize === "sm" || layoutDefinition!.priceFontSize === "base" || layoutDefinition!.priceFontSize === "lg")
      ? layoutDefinition!.priceFontSize
      : "base";
  const priceLineHeight: ContentLineHeight =
    useLayout && (layoutDefinition!.priceLineHeight === "none" || layoutDefinition!.priceLineHeight === "normal")
      ? layoutDefinition!.priceLineHeight
      : "normal";

  const nameClassName = [
    FONT_WEIGHT_CLASSES[nameFontWeight],
    FONT_SIZE_CLASSES[nameFontSize],
    "leading-snug m-0 text-white text-left break-words",
  ].join(" ");
  const priceSizeClass = FONT_SIZE_CLASSES[priceFontSize];
  const priceLeadClass = LINE_HEIGHT_CLASSES[priceLineHeight];

  const renderZoneDestaque = (type: string) => {
    switch (type) {
      case "image":
        return null;
      case "icons":
        return (
          <div className="flex justify-end items-center gap-1.5 flex-wrap min-h-[28px] shrink-0">
            {item.article_type && <MenuIcon code={item.article_type.icon_code} size={22} className="shrink-0 opacity-90" />}
            {item.is_promotion && <MenuIcon code="on-promo" size={22} className="shrink-0" />}
            {item.take_away && <MenuIcon code="take-away" size={22} className="shrink-0" />}
          </div>
        );
      case "name":
        return item.daily_display_name ? (
          <div>
            <div className={`${nameClassName} text-sm text-white/70 font-normal italic`}>{item.menu_name}</div>
            <h3 className={nameClassName}>{item.daily_display_name}</h3>
          </div>
        ) : (
          <h3 className={nameClassName}>{item.menu_name}</h3>
        );
      case "description":
        return item.menu_description ? (
          <p className="mt-0.5 text-white/90 text-sm leading-relaxed text-left break-words">{item.menu_description}</p>
        ) : null;
      case "ingredients":
        return (
          <div className="mt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIngredientsOpen((o) => !o);
              }}
              className="w-fit flex items-center justify-center gap-2 text-sm text-white/95 hover:text-white font-medium py-0.5"
              aria-expanded={ingredientsOpen}
            >
              <i className="fas fa-eye" aria-hidden /> Ingredientes
            </button>
            {ingredientsOpen && (
              <div className="mt-0.5 text-sm text-white/90 whitespace-pre-wrap">{hasIngredients ? item.menu_ingredients : "—"}</div>
            )}
          </div>
        );
      case "prep_time":
        return item.prep_minutes != null ? (
          <div className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
            <MenuIcon code="prep-time" size={18} />
            <span>{item.prep_minutes}&apos;</span>
          </div>
        ) : null;
      case "allergens":
        return item.allergens && item.allergens.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1 items-center">
            {item.allergens.map((a) => {
              const label = getAllergenLabel(a);
              return (
                <span key={a.code} className={ALLERGEN_BADGE_DESTAQUE}>
                  {label}
                </span>
              );
            })}
          </div>
        ) : null;
      case "price_old":
        return item.is_promotion && (item.price_old_display ?? (item.price_old != null ? formatPrice(item.price_old, currencyCode) : null)) != null ? (
          <div className="flex-1 min-w-0 text-center text-sm text-white/70 line-through" aria-label="Preço antigo">
            {item.price_old_display ?? (item.price_old != null ? formatPrice(item.price_old, currencyCode) : null)}
          </div>
        ) : null;
      case "price":
        return (item.menu_price_display ?? (item.menu_price != null ? formatPrice(item.menu_price, currencyCode) : null)) != null ? (
          <div
            className={[
              "italic text-right shrink-0 text-white",
              item.is_promotion ? "text-amber-200" : "",
              item.is_promotion ? "text-lg" : priceSizeClass,
              priceLeadClass,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {item.menu_price_display ?? (item.menu_price != null ? formatPrice(item.menu_price, currencyCode) : null)}
          </div>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <li className="list-none h-full flex shrink-0">
      <article
        className="relative rounded-xl overflow-hidden w-full flex flex-col justify-end min-h-[280px]"
        style={{ minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight }}
      >
        <img
          src={imageSrc}
          alt=""
          aria-hidden
          className="absolute w-0 h-0 opacity-0 pointer-events-none"
          onError={handleImageError}
        />
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: effectiveSrc !== "" ? `url(${effectiveSrc})` : undefined,
            backgroundColor: effectiveSrc === "" ? "rgb(107 114 128)" : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
          aria-hidden
        />
        <div
          className="relative z-10 text-white flex flex-col justify-end min-w-0 overflow-hidden"
          style={{ padding: `${contentPaddingPx}px` }}
        >
          {categoryName && (
            <p className="text-xs font-medium text-white/90 uppercase tracking-wide m-0 mb-1">{categoryName}</p>
          )}
          {useLayout ? (
            <>
              {zoneRows.map((row, rowIdx) => {
                const rowStyle: React.CSSProperties = rowIdx > 0 ? { marginTop: `${rowSpacingPx}px` } : {};
                if (row.length === 1) {
                  const type = row[0];
                  const el = renderZoneDestaque(type);
                  const minH = getEffectiveZoneHeight(type, zoneHeights);
                  const wrapperStyle: React.CSSProperties = { ...rowStyle };
                  if (minH > 0) wrapperStyle.minHeight = `${minH}px`;
                  return el != null ? (
                    <div key={`r-${rowIdx}`} style={wrapperStyle}>
                      {el}
                    </div>
                  ) : null;
                }
                return (
                  <div
                    key={`r-${rowIdx}`}
                    className="flex items-center flex-wrap"
                    style={{ ...rowStyle, gap: `${contentRowGapPx}px` }}
                  >
                    {row.map((type) => {
                      const el = renderZoneDestaque(type);
                      const minH = getEffectiveZoneHeight(type, zoneHeights);
                      const pct = parseZoneWidthPercent(
                        type,
                        layoutDefinition?.zoneWidthPercent,
                        layoutDefinition?.zoneWidths
                      );
                      const wrapperStyle: React.CSSProperties = { flex: `0 0 ${pct}%`, boxSizing: "border-box" };
                      if (minH > 0) wrapperStyle.minHeight = `${minH}px`;
                      return el != null ? (
                        <div key={type} className="min-w-0" style={wrapperStyle}>
                          {el}
                        </div>
                      ) : null;
                    })}
                  </div>
                );
              })}
            </>
          ) : (
            <div className="flex flex-col gap-2">
              {item.daily_display_name ? (
                <>
                  <div className="text-sm text-white/70 font-normal italic m-0 break-words">{item.menu_name}</div>
                  <h3 className="font-bold text-lg text-white m-0 break-words">{item.daily_display_name}</h3>
                </>
              ) : (
                <h3 className="font-bold text-lg text-white m-0 break-words">{item.menu_name}</h3>
              )}
              <div className="flex justify-end items-center gap-1.5 flex-wrap">
                {item.article_type && <MenuIcon code={item.article_type.icon_code} size={22} className="shrink-0 opacity-90" />}
                {item.is_promotion && <MenuIcon code="on-promo" size={22} className="shrink-0" />}
                {item.take_away && <MenuIcon code="take-away" size={22} className="shrink-0" />}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIngredientsOpen((o) => !o);
                }}
                className="w-fit flex items-center justify-center gap-2 text-sm text-white/95 hover:text-white font-medium py-0.5"
                aria-expanded={ingredientsOpen}
              >
                <i className="fas fa-eye" aria-hidden /> Ingredientes
              </button>
              {ingredientsOpen && (
                <div className="text-sm text-white/90 whitespace-pre-wrap">{hasIngredients ? item.menu_ingredients : "—"}</div>
              )}
              {item.allergens && item.allergens.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center">
                  {item.allergens.map((a) => {
                    const label = getAllergenLabel(a);
                    return (
                      <span key={a.code} className={ALLERGEN_BADGE_DESTAQUE}>
                        {label}
                      </span>
                    );
                  })}
                </div>
              )}
              {(item.menu_price_display ?? (item.menu_price != null ? formatPrice(item.menu_price, currencyCode) : null)) != null && (
                <div className="italic text-lg text-white mt-1">
                  {item.menu_price_display ?? (item.menu_price != null ? formatPrice(item.menu_price, currencyCode) : null)}
                </div>
              )}
            </div>
          )}
        </div>
      </article>
    </li>
  );
}
