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
  DEFAULT_CONTENT_PADDING_PX,
  DEFAULT_CONTENT_ROW_GAP_PX,
  parseZoneWidthPercent,
  groupZonesIntoRowsByLineNumber,
  groupZonesIntoRowsByWidthPercent,
} from "@/lib/presentation-templates";
import { formatPrice } from "@/lib/format-price";
import { MenuIcon } from "../menu-icons";
import { getImageSrc, FALLBACK_IMAGE } from "./item-card-restaurante-1";

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

function getEffectiveWidth(type: string, zoneWidths: Record<string, ZoneWidth> | undefined): ZoneWidth {
  if (zoneWidths?.[type]) return zoneWidths[type];
  return type === "price_old" || type === "price" ? "half" : "full";
}

/** Agrupa zoneOrder em linhas conforme zoneWidths (compatível com o editor). */
function groupZonesIntoRows(
  zoneOrder: string[],
  zoneWidths: Record<string, ZoneWidth> | undefined
): string[][] {
  const rows: string[][] = [];
  let i = 0;
  while (i < zoneOrder.length) {
    const type = zoneOrder[i];
    const w = getEffectiveWidth(type, zoneWidths);
    if (w === "full") {
      rows.push([type]);
      i += 1;
    } else if (w === "half") {
      const group = [type];
      i += 1;
      while (i < zoneOrder.length && getEffectiveWidth(zoneOrder[i], zoneWidths) === "half") {
        group.push(zoneOrder[i]);
        i += 1;
        if (group.length >= 2) break;
      }
      rows.push(group);
    } else {
      const group = [type];
      i += 1;
      while (i < zoneOrder.length && getEffectiveWidth(zoneOrder[i], zoneWidths) === "quarter") {
        group.push(zoneOrder[i]);
        i += 1;
        if (group.length >= 4) break;
      }
      rows.push(group);
    }
  }
  return rows;
}

function getAllergenLabel(
  a: { name_i18n?: Record<string, string>; code: string; name?: string },
  locale?: string
): string {
  const i18n = a.name_i18n;
  if (i18n && typeof i18n === "object") {
    if (locale && i18n[locale]) return i18n[locale];
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

function ImageIngredientsModal({
  open,
  onClose,
  imageSrc,
  imageAlt,
  descriptionText,
  ingredientsText,
}: {
  open: boolean;
  onClose: () => void;
  imageSrc: string | null;
  imageAlt: string;
  descriptionText?: string | null;
  ingredientsText: string | null;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Imagem e ingredientes do artigo"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-h-[90vh] w-full max-w-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {imageSrc && (
          <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 shrink-0">
            <img src={imageSrc} alt={imageAlt} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="p-4 overflow-y-auto shrink-0">
          <h4 className="font-semibold text-gray-900 mb-2">DESCRIÇÃO</h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap mb-4">{descriptionText && descriptionText.trim() !== "" ? descriptionText : "—"}</p>
          <h4 className="font-semibold text-gray-900 mb-2 italic">Ingredientes</h4>
          {ingredientsText && ingredientsText.trim() !== "" ? (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{ingredientsText}</p>
          ) : (
            <p className="text-sm text-gray-500">Sem lista de ingredientes.</p>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

type ItemCardFromLayoutProps = {
  item: PublicMenuItem;
  layoutDefinition: LayoutDefinition;
  currencyCode?: string;
  imageSource?: string;
  sampleImageUsage?: string;
};

/** Card de artigo renderizado conforme layout_definition (ordem e visibilidade das zonas). Apenas as zonas em zoneOrder são renderizadas. */
export function ItemCardFromLayout({ item, layoutDefinition, currencyCode, imageSource, sampleImageUsage }: ItemCardFromLayoutProps) {
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const imageSrc = getImageSrc(item, imageSource, sampleImageUsage);
  const [effectiveSrc, setEffectiveSrc] = useState(imageSrc);
  useEffect(() => {
    setEffectiveSrc(imageSrc);
  }, [imageSrc]);
  const hasIngredients = item.menu_ingredients != null && item.menu_ingredients.trim() !== "";
  const noDefaultSample =
    sampleImageUsage === "none" || sampleImageUsage === "category_only" || sampleImageUsage === "article_only";
  const handleImageError = () => setEffectiveSrc(noDefaultSample ? "" : FALLBACK_IMAGE);
  const zoneOrder = layoutDefinition.zoneOrder ?? [];
  const minHeight = layoutDefinition.canvasHeight != null && layoutDefinition.canvasHeight > 0
    ? layoutDefinition.canvasHeight
    : undefined;
  const rowSpacingPx = layoutDefinition.rowSpacingPx != null && layoutDefinition.rowSpacingPx >= 0 && layoutDefinition.rowSpacingPx <= 48
    ? layoutDefinition.rowSpacingPx
    : 8;
  const zoneHeights = layoutDefinition.zoneHeights;
  const imageHeightPx =
    zoneHeights?.image != null && zoneHeights.image !== 0
      ? getEffectiveZoneHeight("image", zoneHeights)
      : null;

  const contentPaddingPx =
    layoutDefinition.contentPaddingPx != null && Number.isFinite(layoutDefinition.contentPaddingPx)
      ? Math.max(CONTENT_PADDING_MIN, Math.min(CONTENT_PADDING_MAX, Math.round(Number(layoutDefinition.contentPaddingPx))))
      : DEFAULT_CONTENT_PADDING_PX;
  const contentRowGapPx =
    layoutDefinition.contentRowGapPx != null && Number.isFinite(layoutDefinition.contentRowGapPx)
      ? Math.max(CONTENT_ROW_GAP_MIN, Math.min(CONTENT_ROW_GAP_MAX, Math.round(Number(layoutDefinition.contentRowGapPx))))
      : DEFAULT_CONTENT_ROW_GAP_PX;

  const nameFontSize: ContentFontSize =
    layoutDefinition.nameFontSize === "sm" || layoutDefinition.nameFontSize === "base" || layoutDefinition.nameFontSize === "lg"
      ? layoutDefinition.nameFontSize
      : "lg";
  const nameFontWeight: ContentFontWeight =
    layoutDefinition.nameFontWeight === "semibold" || layoutDefinition.nameFontWeight === "bold"
      ? layoutDefinition.nameFontWeight
      : "bold";
  const priceFontSize: ContentFontSize =
    layoutDefinition.priceFontSize === "sm" || layoutDefinition.priceFontSize === "base" || layoutDefinition.priceFontSize === "lg"
      ? layoutDefinition.priceFontSize
      : "base";
  const priceLineHeight: ContentLineHeight =
    layoutDefinition.priceLineHeight === "none" || layoutDefinition.priceLineHeight === "normal"
      ? layoutDefinition.priceLineHeight
      : "normal";

  const nameClassName = [
    FONT_WEIGHT_CLASSES[nameFontWeight],
    FONT_SIZE_CLASSES[nameFontSize],
    "leading-snug m-0 text-gray-900 text-left min-w-0 truncate",
  ].join(" ");
  const priceSizeClass = FONT_SIZE_CLASSES[priceFontSize];
  const priceLeadClass = LINE_HEIGHT_CLASSES[priceLineHeight];

  const renderZone = (type: string) => {
    switch (type) {
      case "image":
        return (
          <button
            type="button"
            onClick={() => setImageModalOpen(true)}
            className={`block w-full max-w-full overflow-hidden bg-gray-100 text-left focus:outline-none border-0 ${imageHeightPx == null ? "aspect-[4/3]" : ""}`}
            style={imageHeightPx != null ? { height: `${imageHeightPx}px`, minHeight: `${imageHeightPx}px` } : undefined}
            aria-label={`Ver imagem e ingredientes de ${item.menu_name ?? "artigo"}`}
          >
            {effectiveSrc === "" ? (
              <span className="block w-full h-full min-h-0 overflow-hidden bg-gray-100" aria-hidden style={imageHeightPx != null ? { height: `${imageHeightPx}px` } : undefined} />
            ) : (
              <img src={effectiveSrc} alt={item.menu_name ?? ""} className="h-full w-full max-w-full object-cover border-0" onError={handleImageError} />
            )}
          </button>
        );
      case "icons":
        return (
          <div className="flex justify-end items-center gap-1.5 flex-wrap min-h-[28px] shrink-0">
            {item.article_type && <MenuIcon code={item.article_type.icon_code} size={22} className="shrink-0" />}
            {item.is_promotion && <MenuIcon code="on-promo" size={22} className="shrink-0" />}
            {item.take_away && <MenuIcon code="take-away" size={22} className="shrink-0" />}
          </div>
        );
      case "name":
        return (
          <h3 className={nameClassName}>{item.menu_name}</h3>
        );
      case "description":
        return item.menu_description ? (
          <p className="mt-0.5 text-gray-600 text-sm leading-relaxed text-left">{item.menu_description}</p>
        ) : null;
      case "ingredients":
        return (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setIngredientsOpen((o) => !o)}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium py-0.5"
              aria-expanded={ingredientsOpen}
            >
              <i className="fas fa-eye" aria-hidden />
              <span>Ingredientes</span>
            </button>
            {ingredientsOpen && (
              <div className="mt-0.5 text-sm text-gray-600 whitespace-pre-wrap">{hasIngredients ? item.menu_ingredients : "—"}</div>
            )}
          </div>
        );
      case "prep_time":
        return item.prep_minutes != null ? (
          <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <MenuIcon code="prep-time" size={18} />
            <span>{item.prep_minutes}&apos;</span>
          </div>
        ) : null;
      case "allergens":
        return item.allergens && item.allergens.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1 items-center">
            <span className="text-xs text-gray-500 mr-1">Alergénios:</span>
            {item.allergens.map((a) => {
              const severity = a.severity != null && a.severity >= 1 && a.severity <= 5 ? a.severity : 2;
              const label = getAllergenLabel(a);
              const badgeClass = SEVERITY_CLASSES[severity] ?? SEVERITY_CLASSES[2];
              return (
                <span key={a.code} className={`text-xs px-1.5 py-0.5 rounded ${badgeClass}`}>
                  {label}
                </span>
              );
            })}
          </div>
        ) : null;
      case "price_old":
        return item.is_promotion && (item.price_old_display ?? (item.price_old != null ? formatPrice(item.price_old, currencyCode) : null)) != null ? (
          <div className="flex-1 min-w-0 text-center text-sm text-gray-400 line-through" aria-label="Preço antigo">
            {item.price_old_display ?? (item.price_old != null ? formatPrice(item.price_old, currencyCode) : null)}
          </div>
        ) : null;
      case "price":
        return (item.menu_price_display ?? (item.menu_price != null ? formatPrice(item.menu_price, currencyCode) : null)) != null ? (
          <div
            className={[
              "italic text-right shrink-0",
              item.is_promotion ? "text-amber-700" : "text-gray-900",
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

  const zoneRows = useMemo(() => {
    const byLine = groupZonesIntoRowsByLineNumber(zoneOrder, layoutDefinition.zoneLineNumbers);
    if (byLine != null && byLine.length > 0) return byLine;
    if (
      (layoutDefinition.zoneWidthPercent && Object.keys(layoutDefinition.zoneWidthPercent).length > 0) ||
      (layoutDefinition.zoneWidths && Object.keys(layoutDefinition.zoneWidths).length > 0)
    ) {
      return groupZonesIntoRowsByWidthPercent(
        zoneOrder,
        layoutDefinition.zoneWidthPercent,
        layoutDefinition.zoneWidths
      );
    }
    const defaultZoneWidthPercent: Record<string, number> = {};
    if (zoneOrder.includes("name")) defaultZoneWidthPercent["name"] = 75;
    if (zoneOrder.includes("price")) defaultZoneWidthPercent["price"] = 25;
    if (zoneOrder.includes("price_old")) defaultZoneWidthPercent["price_old"] = 25;
    return groupZonesIntoRowsByWidthPercent(zoneOrder, defaultZoneWidthPercent, undefined);
  }, [
    zoneOrder,
    layoutDefinition.zoneWidths,
    layoutDefinition.zoneWidthPercent,
    layoutDefinition.zoneLineNumbers,
  ]);
  const hasImage = zoneOrder.includes("image");
  const imageRowIndex = zoneRows.findIndex((row) => row.length === 1 && row[0] === "image");
  const contentRows = useMemo(
    () => zoneRows.filter((_, idx) => idx !== imageRowIndex),
    [zoneRows, imageRowIndex]
  );

  return (
    <li className="list-none h-full flex">
      <article
        className="rounded-xl border border-gray-200 bg-white shadow-md overflow-hidden flex flex-col w-full min-w-0 h-full"
        style={minHeight != null ? { minHeight: `${minHeight}px` } : undefined}
      >
        {hasImage && imageRowIndex >= 0 && renderZone("image")}
        <div
          className="flex flex-col flex-1 min-h-0 min-w-0"
          style={{ padding: `${contentPaddingPx}px` }}
        >
          {contentRows.map((row, rowIdx) => {
            const rowStyle: React.CSSProperties = rowIdx > 0 ? { marginTop: `${rowSpacingPx}px` } : {};
            if (row.length === 1) {
              const type = row[0];
              const el = renderZone(type);
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
                className="flex items-center flex-nowrap"
                style={{ ...rowStyle, gap: `${contentRowGapPx}px` }}
              >
                {row.map((type) => {
                  const el = renderZone(type);
                  const minH = getEffectiveZoneHeight(type, zoneHeights);
                  const pct = parseZoneWidthPercent(
                    type,
                    layoutDefinition.zoneWidthPercent,
                    layoutDefinition.zoneWidths
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
        </div>
      </article>
      <ImageIngredientsModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        imageSrc={effectiveSrc}
        imageAlt={item.menu_name ?? ""}
        descriptionText={item.menu_description ?? null}
        ingredientsText={item.menu_ingredients}
      />
    </li>
  );
}
