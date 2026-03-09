"use client";

import { useState, useEffect } from "react";
import type { PublicMenuItem } from "@/lib/supabase";
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

const DEFAULT_CANVAS_HEIGHT = 560;

/** Card de destaque "Modelo Destaque 1" — imagem de fundo em cover + overlay em gradiente por cima para legibilidade do texto (nome, ingredientes, badges, preço). Imagem e overlay são uma única camada de fundo; independente da config em Modelos de apresentação de Destaques. */
export function ItemCardDestaque1({
  item,
  categoryName,
  currencyCode,
  imageSource,
}: {
  item: PublicMenuItem;
  categoryName?: string;
  currencyCode?: string;
  imageSource?: string;
}) {
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const imageSrc = getImageSrc(item, imageSource);
  const [effectiveSrc, setEffectiveSrc] = useState(imageSrc);
  useEffect(() => {
    setEffectiveSrc(imageSrc);
  }, [imageSrc]);
  const hasIngredients = item.menu_ingredients != null && item.menu_ingredients.trim() !== "";

  return (
    <li className="list-none h-full flex shrink-0">
      <article
        className="relative rounded-xl overflow-hidden w-full flex flex-col justify-end min-h-[280px]"
        style={{ minHeight: DEFAULT_CANVAS_HEIGHT }}
      >
        <img
          src={imageSrc}
          alt=""
          aria-hidden
          className="absolute w-0 h-0 opacity-0 pointer-events-none"
          onError={() => setEffectiveSrc(FALLBACK_IMAGE)}
        />
        {/* Fundo: apenas imagem do artigo em cover (overlay removido para validação). */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${effectiveSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
        <button
          type="button"
          onClick={() => setImageModalOpen(true)}
          className="absolute inset-0 z-0 cursor-pointer"
          aria-label={`Ver imagem e ingredientes de ${item.menu_name ?? "artigo"}`}
        />
        <div className="relative z-10 p-4 text-white flex flex-col gap-2">
          {categoryName && (
            <p className="text-xs font-medium text-white/90 uppercase tracking-wide m-0">{categoryName}</p>
          )}
          <h3 className="font-bold text-lg text-white m-0">{item.menu_name}</h3>
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
            className="w-fit text-sm text-white/95 hover:text-white font-medium py-0.5"
            aria-expanded={ingredientsOpen}
          >
            Ingredientes {ingredientsOpen ? "−" : "+"}
          </button>
          {ingredientsOpen && (
            <div className="text-sm text-white/90 whitespace-pre-wrap">{hasIngredients ? item.menu_ingredients : "—"}</div>
          )}
          {item.allergens && item.allergens.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
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
          )}
          {(item.menu_price_display ?? (item.menu_price != null ? formatPrice(item.menu_price, currencyCode) : null)) != null && (
            <div className="font-bold text-lg text-white mt-1">
              {item.menu_price_display ?? (item.menu_price != null ? formatPrice(item.menu_price, currencyCode) : null)}
            </div>
          )}
        </div>
      </article>
      <ImageIngredientsModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        imageSrc={effectiveSrc}
        imageAlt={item.menu_name ?? ""}
        ingredientsText={item.menu_ingredients}
      />
    </li>
  );
}
