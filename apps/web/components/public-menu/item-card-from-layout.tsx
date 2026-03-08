"use client";

import { useState, useEffect } from "react";
import type { PublicMenuItem } from "@/lib/supabase";
import type { LayoutDefinition } from "@/lib/presentation-templates";
import { MenuIcon } from "../menu-icons";
import { getImageSrc } from "./item-card-restaurante-1";

function formatPrice(value: number, currencyCode?: string): string {
  const formatted = value.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const code = (currencyCode || "€").trim();
  return code === "€" || code === "EUR" ? `${formatted} €` : `${formatted} ${code}`;
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
  ingredientsText,
}: {
  open: boolean;
  onClose: () => void;
  imageSrc: string | null;
  imageAlt: string;
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
          {ingredientsText && ingredientsText.trim() !== "" ? (
            <>
              <h4 className="font-semibold text-gray-900 mb-2">Ingredientes</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{ingredientsText}</p>
            </>
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
};

/** Card de artigo renderizado conforme layout_definition (ordem e visibilidade das zonas). */
export function ItemCardFromLayout({ item, layoutDefinition, currencyCode }: ItemCardFromLayoutProps) {
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const imageSrc = getImageSrc(item);
  const hasIngredients = item.menu_ingredients != null && item.menu_ingredients.trim() !== "";
  const zoneOrder = layoutDefinition.zoneOrder ?? [];
  const minHeight = layoutDefinition.canvasHeight != null && layoutDefinition.canvasHeight > 0
    ? layoutDefinition.canvasHeight
    : undefined;

  const renderZone = (type: string) => {
    switch (type) {
      case "image":
        return (
          <button
            type="button"
            onClick={() => setImageModalOpen(true)}
            className="block w-full aspect-[4/3] overflow-hidden bg-gray-100 text-left focus:outline-none border-0"
            aria-label={`Ver imagem e ingredientes de ${item.menu_name ?? "artigo"}`}
          >
            <img src={imageSrc} alt={item.menu_name ?? ""} className="h-full w-full object-cover border-0" />
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
          <h3 className="font-bold text-lg text-gray-900 text-left mt-0.5">{item.menu_name}</h3>
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
              className="w-full flex justify-between items-center text-left text-sm text-gray-600 hover:text-gray-900 font-medium py-0.5"
              aria-expanded={ingredientsOpen}
            >
              <span>Ingredientes</span>
              <span className="font-bold shrink-0 ml-2">{ingredientsOpen ? "−" : "+"}</span>
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
        return item.is_promotion && item.price_old != null ? (
          <div className="flex-1 min-w-0 text-center text-sm text-gray-400 line-through" aria-label="Preço antigo">
            {formatPrice(item.price_old, currencyCode)}
          </div>
        ) : null;
      case "price":
        return item.menu_price != null ? (
          <div className={`font-bold text-right shrink-0 ${item.is_promotion ? "text-lg text-amber-700" : "text-base text-gray-900"}`}>
            {formatPrice(item.menu_price, currencyCode)}
          </div>
        ) : null;
      default:
        return null;
    }
  };

  const contentZones = zoneOrder.filter((t) => t !== "image");
  const hasImage = zoneOrder.includes("image");
  const priceRowZones = zoneOrder.filter((t) => t === "price_old" || t === "price");
  const contentWithoutPriceRow = contentZones.filter((t) => t !== "price_old" && t !== "price");

  return (
    <li className="list-none h-full flex">
      <article
        className="rounded-xl border border-gray-200 bg-white shadow-md overflow-hidden flex flex-col w-full h-full"
        style={minHeight != null ? { minHeight: `${minHeight}px` } : undefined}
      >
        {hasImage && renderZone("image")}
        <div className="p-3 flex flex-col flex-1 min-h-0">
          {contentWithoutPriceRow.map((type) => {
            const el = renderZone(type);
            return el != null ? <div key={type}>{el}</div> : null;
          })}
          {priceRowZones.length > 0 && (
            <div className={`mt-2 flex items-center gap-4 ${priceRowZones.length === 2 ? "" : "justify-end"}`}>
              {priceRowZones.map((type) => (
                <div key={type}>{renderZone(type)}</div>
              ))}
            </div>
          )}
        </div>
      </article>
      <ImageIngredientsModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        imageSrc={imageSrc}
        imageAlt={item.menu_name ?? ""}
        ingredientsText={item.menu_ingredients}
      />
    </li>
  );
}
