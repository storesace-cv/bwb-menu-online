"use client";

import { useState, useEffect } from "react";
import type { PublicMenuItem } from "@/lib/supabase";
import { formatPrice } from "@/lib/format-price";
import { MenuIcon } from "../menu-icons";
import {
  getImageSrc,
  FALLBACK_IMAGE,
  ImageIngredientsModal,
  getAllergenLabel,
  SEVERITY_CLASSES,
} from "./item-card-restaurante-1";

const zoneRowClass = "min-h-0";

/** Card "Modelo Restaurante 2": imagem à esquerda, conteúdo à direita. inRowCards devolve 8 zonas (subgrid) como Restaurante 1. */
export function ItemCardRestaurante2({
  item,
  currencyCode,
  imageSource,
  inRowCards,
}: {
  item: PublicMenuItem;
  currencyCode?: string;
  imageSource?: string;
  inRowCards?: boolean;
}) {
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const imageSrc = getImageSrc(item, imageSource);
  const [effectiveSrc, setEffectiveSrc] = useState(imageSrc);
  useEffect(() => {
    setEffectiveSrc(imageSrc);
  }, [imageSrc]);
  const hasIngredients = item.menu_ingredients != null && item.menu_ingredients.trim() !== "";

  const modal = (
    <ImageIngredientsModal
      open={imageModalOpen}
      onClose={() => setImageModalOpen(false)}
      imageSrc={effectiveSrc}
      imageAlt={item.menu_name ?? ""}
      ingredientsText={item.menu_ingredients}
    />
  );

  if (inRowCards) {
    return (
      <>
        <div className={`overflow-hidden ${zoneRowClass}`}>
          <button
            type="button"
            onClick={() => setImageModalOpen(true)}
            className="block w-full aspect-[4/3] overflow-hidden bg-gray-100 text-left focus:outline-none border-0"
            aria-label={`Ver imagem e ingredientes de ${item.menu_name ?? "artigo"}`}
          >
            <img src={effectiveSrc} alt={item.menu_name ?? ""} className="h-full w-full object-cover border-0" onError={() => setEffectiveSrc(FALLBACK_IMAGE)} />
          </button>
        </div>
        <div className={`px-3 pt-0 flex justify-end items-center gap-1.5 flex-wrap min-h-[16px] ${zoneRowClass}`}>
          {item.article_type && <MenuIcon code={item.article_type.icon_code} size={22} className="shrink-0" />}
          {item.is_promotion && <MenuIcon code="on-promo" size={22} className="shrink-0" />}
          {item.take_away && <MenuIcon code="take-away" size={22} className="shrink-0" />}
        </div>
        <div className={`px-3 ${zoneRowClass}`}>
          <h3 className="font-bold text-lg text-gray-900 text-left mt-0 m-0">{item.menu_name}</h3>
        </div>
        <div className={`px-3 ${zoneRowClass}`}>
          {item.menu_description ? (
            <p className="mt-0 text-gray-600 text-sm leading-relaxed text-left m-0">{item.menu_description}</p>
          ) : (
            <span className="block min-h-0" aria-hidden />
          )}
        </div>
        <div className={`px-3 ${zoneRowClass}`}>
          <div className="mt-0">
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
              <div className="mt-0 text-sm text-gray-600 whitespace-pre-wrap">{hasIngredients ? item.menu_ingredients : "—"}</div>
            )}
          </div>
        </div>
        <div className={`px-3 ${zoneRowClass}`}>
          {item.prep_minutes != null ? (
            <div className="mt-0 flex items-center gap-1.5 text-sm text-gray-500">
              <MenuIcon code="prep-time" size={18} />
              <span>{item.prep_minutes}&apos;</span>
            </div>
          ) : (
            <span className="block min-h-0" aria-hidden />
          )}
        </div>
        <div className={`px-3 ${zoneRowClass}`}>
          {item.allergens && item.allergens.length > 0 ? (
            <div className="mt-0 flex flex-wrap gap-1 items-center">
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
          ) : (
            <span className="block min-h-0" aria-hidden />
          )}
        </div>
        <div className={`px-3 pb-0.5 ${zoneRowClass}`}>
          <div className={`mt-0 flex items-center gap-4 ${item.is_promotion && item.price_old != null ? "" : "justify-end"}`}>
            {item.is_promotion && (item.price_old_display ?? (item.price_old != null ? formatPrice(item.price_old, currencyCode) : null)) != null && (
              <div className="flex-1 min-w-0 text-center text-sm text-gray-400 line-through" aria-label="Preço antigo">
                {item.price_old_display ?? (item.price_old != null ? formatPrice(item.price_old, currencyCode) : null)}
              </div>
            )}
            {(item.menu_price_display ?? (item.menu_price != null ? formatPrice(item.menu_price, currencyCode) : null)) != null && (
              <div className={`font-bold text-right shrink-0 ${item.is_promotion ? "text-lg text-amber-700" : "text-base text-gray-900"}`}>
                {item.menu_price_display ?? (item.menu_price != null ? formatPrice(item.menu_price, currencyCode) : null)}
              </div>
            )}
          </div>
        </div>
        {modal}
      </>
    );
  }

  return (
    <li className="list-none h-full flex">
      <article className="rounded-xl border border-gray-200 bg-white shadow-md overflow-hidden flex flex-col sm:flex-row w-full h-full min-h-0">
        <button
          type="button"
          onClick={() => setImageModalOpen(true)}
          className="block w-full sm:w-[40%] sm:min-w-[200px] sm:h-full aspect-[4/3] sm:aspect-auto overflow-hidden bg-gray-100 text-left focus:outline-none border-0 shrink-0"
          aria-label={`Ver imagem e ingredientes de ${item.menu_name ?? "artigo"}`}
        >
          <img
            src={effectiveSrc}
            alt={item.menu_name ?? ""}
            className="h-full w-full object-cover border-0 min-h-[200px] sm:min-h-0"
            onError={() => setEffectiveSrc(FALLBACK_IMAGE)}
          />
        </button>
        <div className="flex-1 flex flex-col min-w-0 p-3 sm:p-4">
          <h3 className="font-bold text-lg text-gray-900 text-left mt-0 mb-1">{item.menu_name}</h3>
          <div className="flex items-center justify-between gap-2 flex-wrap min-h-[28px]">
            {item.prep_minutes != null ? (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <MenuIcon code="prep-time" size={18} />
                <span>{item.prep_minutes}&apos;</span>
              </div>
            ) : (
              <span aria-hidden />
            )}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {item.article_type && <MenuIcon code={item.article_type.icon_code} size={22} className="shrink-0" />}
              {item.is_promotion && <MenuIcon code="on-promo" size={22} className="shrink-0" />}
              {item.take_away && <MenuIcon code="take-away" size={22} className="shrink-0" />}
            </div>
          </div>
          {item.menu_description && (
            <p className="mt-0 text-gray-600 text-sm leading-relaxed text-left">{item.menu_description}</p>
          )}
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
            <div>
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
            <div>
              {item.allergens && item.allergens.length > 0 ? (
                <div className="flex flex-wrap gap-1 items-center">
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
              ) : (
                <span className="text-sm text-gray-400">—</span>
              )}
            </div>
          </div>
          <div className={`mt-auto pt-2 flex items-center gap-4 ${item.is_promotion && item.price_old != null ? "" : "justify-end"}`}>
            {item.is_promotion && (item.price_old_display ?? (item.price_old != null ? formatPrice(item.price_old, currencyCode) : null)) != null && (
              <div className="flex-1 min-w-0 text-left text-sm text-gray-400 line-through" aria-label="Preço antigo">
                {item.price_old_display ?? (item.price_old != null ? formatPrice(item.price_old, currencyCode) : null)}
              </div>
            )}
            {(item.menu_price_display ?? (item.menu_price != null ? formatPrice(item.menu_price, currencyCode) : null)) != null && (
              <div className={`font-bold text-right shrink-0 ${item.is_promotion ? "text-lg text-amber-700" : "text-base text-gray-900"}`}>
                {item.menu_price_display ?? (item.menu_price != null ? formatPrice(item.menu_price, currencyCode) : null)}
              </div>
            )}
          </div>
        </div>
      </article>
      {modal}
    </li>
  );
}
