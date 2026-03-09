"use client";

import type { ComponentType } from "react";
import { useState, useMemo, useRef, useEffect } from "react";
import type { PublicMenuPayload, PublicMenuInitialPayload, PublicMenuItem } from "@/lib/supabase";
import type { LayoutDefinition } from "@/lib/presentation-templates";
import { getPresentationCardComponent, DEFAULT_PRESENTATION_KEY } from "@/lib/presentation-templates";
import { ItemCardFromLayout } from "./item-card-from-layout";
import { FeaturedCarouselSection } from "./featured-carousel-section";
import { FabSpeedDial } from "./fab-speed-dial";
import { BottomSheet } from "./bottom-sheet";
import { scrollToSection } from "@/lib/scroll-to-section";

const FALLBACK_PRIMARY = "#8b6914";

/** Uma linha de 2 cards usando o componente de apresentação escolhido ou layout. */
function RowCards({
  items,
  currencyCode,
  CardComponent,
  layoutDefinition,
  imageSource,
}: {
  items: [PublicMenuItem, PublicMenuItem | null];
  currencyCode?: string;
  CardComponent: ComponentType<{ item: PublicMenuItem; currencyCode?: string; imageSource?: string }>;
  layoutDefinition?: LayoutDefinition | null;
  imageSource?: string;
}) {
  const [left, right] = items;
  const useLayout = layoutDefinition != null && Array.isArray(layoutDefinition.zoneOrder) && layoutDefinition.zoneOrder.length > 0;
  return (
    <div className="grid grid-cols-2 gap-6">
      {useLayout ? (
        <ItemCardFromLayout item={left} layoutDefinition={layoutDefinition} currencyCode={currencyCode} imageSource={imageSource} />
      ) : (
        <CardComponent item={left} currencyCode={currencyCode} imageSource={imageSource} />
      )}
      {right ? (
        useLayout ? (
          <ItemCardFromLayout item={right} layoutDefinition={layoutDefinition} currencyCode={currencyCode} imageSource={imageSource} />
        ) : (
          <CardComponent item={right} currencyCode={currencyCode} imageSource={imageSource} />
        )
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 min-h-[200px]" aria-hidden />
      )}
    </div>
  );
}

const DEFAULT_TEMPLATE_KEY = "bwb-branco";

function pairs<T>(arr: T[]): [T, T | null][] {
  const out: [T, T | null][] = [];
  for (let i = 0; i < arr.length; i += 2) {
    out.push([arr[i], arr[i + 1] ?? null]);
  }
  return out;
}

function collectFeaturedItems(menu: PublicMenuPayload): PublicMenuItem[] {
  const out: PublicMenuItem[] = [];
  (menu.categories ?? []).forEach((cat) => {
    cat.items?.forEach((item) => {
      if (item.is_featured) out.push(item);
    });
  });
  return out;
}

/** Featured items with category name for the carousel (order preserved from menu). Fallback when payload has no top-level featured_items. */
function collectFeaturedItemsWithCategory(menu: PublicMenuPayload): { item: PublicMenuItem; categoryName: string }[] {
  const out: { item: PublicMenuItem; categoryName: string }[] = [];
  (menu.categories ?? []).forEach((cat) => {
    cat.items?.forEach((item) => {
      if (item.is_featured) out.push({ item, categoryName: cat.name });
    });
  });
  return out;
}

/** Quando existir alternância de secções, usar getPublicMenuSectionCategories(host, sectionId, currencyCode) para lazy load das categorias da secção e merge em estado (ex.: Map<sectionId, categories>). */
export function BwbBrancoTemplate({ menu }: { menu: PublicMenuInitialPayload | PublicMenuPayload }) {
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [isCategoriesPanelOpen, setIsCategoriesPanelOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sectionsSheetOpen, setSectionsSheetOpen] = useState(false);
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currencyCode = menu.store_settings?.currency_code ?? "€";
  const storeName = menu.store_settings?.store_display_name || menu.store_name || "Menu";
  const heroText = menu.store_settings?.hero_text;
  const reservationUrl = menu.store_settings?.reservation_url;
  const footerText = menu.store_settings?.footer_text;
  const contactUrl = menu.store_settings?.contact_url;
  const privacyUrl = menu.store_settings?.privacy_url;
  const primaryColor = (menu.store_settings?.primary_color?.trim() || FALLBACK_PRIMARY) as string;

  const sectionTitleAlign = menu.store_settings?.section_title_align?.trim() || "center";
  const sectionTitleMarginBottom = menu.store_settings?.section_title_margin_bottom?.trim() || "20";
  const sectionTitlePaddingTop = menu.store_settings?.section_title_padding_top?.trim() || "20";
  const sectionTitleColor = menu.store_settings?.section_title_color?.trim() || "";

  const categoryTitleAlign = menu.store_settings?.category_title_align?.trim() || "left";
  const categoryTitleMarginBottom = menu.store_settings?.category_title_margin_bottom?.trim() || "15";
  const categoryTitlePaddingTop = menu.store_settings?.category_title_padding_top?.trim() || "16";
  const categoryTitleIndentPx = menu.store_settings?.category_title_indent_px?.trim() || "10";
  const categoryTitleColor = menu.store_settings?.category_title_color?.trim() || "rgb(167, 143, 57)";

  const featuredItems = useMemo(() => collectFeaturedItems(menu), [menu]);
  const featuredItemsWithCategory = useMemo(
    () => ("featured_items" in menu && menu.featured_items?.length) ? menu.featured_items : collectFeaturedItemsWithCategory(menu),
    [menu]
  );
  const featuredSectionLabel = menu.store_settings?.featured_section_label?.trim() || "Escolhas do Chefe";
  const featuredTemplateKey = menu.store_settings?.featured_template_key?.trim() || "modelo-destaque-1";
  const featuredLayoutDefinition = menu.featured_layout_definition ?? null;
  const imageSource = menu.store_settings?.image_source?.trim() || undefined;

  const filteredCategories = menu.categories ?? [];

  const currentSectionName = useMemo(() => {
    const first = filteredCategories[0];
    return first?.section_name ?? null;
  }, [filteredCategories]);

  const categoriesBySection = useMemo(() => {
    const sections = menu.sections ?? [];
    const result: { sectionId: string | null; sectionName: string; categories: typeof filteredCategories }[] = [];
    if (sections.length === 0) {
      if (filteredCategories.length > 0) {
        result.push({ sectionId: null, sectionName: "Menu", categories: filteredCategories });
      }
      return result;
    }
    for (const sec of sections) {
      const cats = filteredCategories.filter((c) => c.section_id === sec.id);
      if (cats.length > 0) {
        result.push({ sectionId: sec.id, sectionName: sec.name, categories: cats });
      }
    }
    const uncategorized = filteredCategories.filter((c) => !c.section_id);
    if (uncategorized.length > 0) {
      result.push({ sectionId: null, sectionName: "Outros", categories: uncategorized });
    }
    return result;
  }, [menu.sections, filteredCategories]);

  useEffect(() => {
    if (isSearchOpen) {
      const t = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(t);
    }
  }, [isSearchOpen]);

  const handleOpenSections = () => setSectionsSheetOpen(true);
  const handleSelectSection = (sectionId: string | null) => {
    const id = sectionId ?? "none";
    scrollToSection(`section-${id}`);
    setSectionsSheetOpen(false);
  };
  const handleOpenLanguage = () => setLanguageSheetOpen(true);
  // TODO: idioma — funcionalidade futura; por agora só UI "Em breve".
  const handleReserveTable = () => setReservationModalOpen(true);

  // suppressHydrationWarning: tolera alterações ao DOM por extensões do browser (ex.: token-signing) que provocam mismatch de hidratação (#418/#423); conteúdo final é equivalente.
  return (
    <div
      className="menu-public-contents"
      style={
        {
          "--menu-primary": primaryColor,
          "--menu-primary-foreground": "#fff",
        } as React.CSSProperties
      }
      suppressHydrationWarning
    >
      {/* Header */}
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          {menu.store_settings?.logo_url ? (
            <img
              src={menu.store_settings.logo_url}
              alt={storeName}
              className="max-h-12 w-auto object-contain"
            />
          ) : (
            <h1 className="m-0 text-2xl font-bold text-gray-900">{storeName}</h1>
          )}
        </div>
      </header>

      {/* Reservation modal */}
      {reservationModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reservation-modal-title"
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
          onClick={() => setReservationModalOpen(false)}
        >
          <div
            className="bg-white p-6 rounded-xl max-w-sm w-[90%] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="reservation-modal-title" className="mt-0 text-lg font-semibold">Reservar uma mesa</h3>
            <p className="text-gray-600 text-sm mt-1">
              Em breve poderá efectuar a sua reserva aqui. Entretanto, contacte-nos directamente.
            </p>
            <button
              type="button"
              onClick={() => setReservationModalOpen(false)}
              className="mt-3 px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Hero (text banner) */}
      {heroText && (
        <section
          className="mb-8 p-6 rounded-xl text-gray-800"
          style={{ backgroundColor: "color-mix(in srgb, var(--menu-primary) 12%, white)" }}
        >
          <p className="m-0 text-lg leading-relaxed whitespace-pre-wrap">{heroText}</p>
        </section>
      )}

      {/* Search (shown when FAB opens search) */}
      {isSearchOpen && (
        <section className="mb-4">
          <label htmlFor="menu-search-input" className="sr-only">
            Pesquisar artigos
          </label>
          <input
            ref={searchInputRef}
            id="menu-search-input"
            type="search"
            placeholder="Pesquisar artigos…"
            className="w-full py-3 px-4 rounded-lg border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
            aria-label="Pesquisar artigos"
          />
        </section>
      )}

      {/* Carrossel de destaques */}
      <FeaturedCarouselSection
        featuredItems={featuredItemsWithCategory}
        featuredSectionLabel={featuredSectionLabel}
        featuredTemplateKey={featuredTemplateKey}
        featuredLayoutDefinition={featuredLayoutDefinition as LayoutDefinition | null}
        currencyCode={currencyCode}
        imageSource={imageSource}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500" aria-label="Breadcrumb">
        HOME
        {storeName && ` / ${storeName}`}
        {currentSectionName && ` / ${currentSectionName}`}
      </nav>

      {/* Sections & categories */}
      {filteredCategories.length === 0 ? (
        <p className="text-gray-600">Nenhum item corresponde aos filtros.</p>
      ) : (
        categoriesBySection.map((group) => (
          <div
            key={group.sectionId ?? "_none"}
            id={`section-${group.sectionId ?? "none"}`}
            className="mb-10"
          >
            <h1
              className={`mt-0 title ${sectionTitleAlign === "left" ? "text-left" : sectionTitleAlign === "right" ? "text-right" : "text-center"}`}
              style={{
                marginBottom: `${sectionTitleMarginBottom}px`,
                paddingTop: `${sectionTitlePaddingTop}px`,
                ...(sectionTitleColor ? { color: sectionTitleColor } : {}),
              }}
            >
              {group.sectionName}
            </h1>
            {group.categories.map((cat) => {
              const layoutDef = cat.presentation_layout_definition;
              const useLayout = layoutDef != null && Array.isArray(layoutDef.zoneOrder) && layoutDef.zoneOrder.length > 0;
              const CardComponent = getPresentationCardComponent(cat.presentation_component_key);
              return (
                <section key={cat.id} className="mb-8" style={{ marginLeft: `${categoryTitleIndentPx}px` }}>
                  <h3
                    className={`mt-0 title ${categoryTitleAlign === "left" ? "text-left" : categoryTitleAlign === "right" ? "text-right" : "text-center"}`}
                    style={{
                      marginBottom: `${categoryTitleMarginBottom}px`,
                      paddingTop: `${categoryTitlePaddingTop}px`,
                      color: categoryTitleColor,
                    }}
                  >
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-gray-600 text-sm mb-4">{cat.description}</p>
                  )}
                  <div className="block sm:hidden">
                    <ul className="p-0 m-0 list-none grid grid-cols-1 gap-6">
                      {cat.items?.map((item) =>
                        useLayout ? (
                          <ItemCardFromLayout key={item.id} item={item} layoutDefinition={layoutDef as LayoutDefinition} currencyCode={currencyCode} imageSource={imageSource} />
                        ) : (
                          <CardComponent key={item.id} item={item} currencyCode={currencyCode} imageSource={imageSource} />
                        )
                      )}
                    </ul>
                  </div>
                  <div className="hidden sm:block">
                    <ul className="p-0 m-0 list-none flex flex-col gap-6">
                      {cat.items && pairs(cat.items).map((pair) => (
                        <li key={pair[0].id + (pair[1]?.id ?? "solo")} className="list-none">
                          <RowCards items={pair} currencyCode={currencyCode} CardComponent={CardComponent} layoutDefinition={layoutDef as LayoutDefinition} imageSource={imageSource} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              );
            })}
          </div>
        ))
      )}

      {/* Footer */}
      <footer className="mt-10 pt-6 border-t border-gray-200 text-sm text-gray-600">
        {footerText && (
          <div className="mb-3 whitespace-pre-wrap">{footerText}</div>
        )}
        <div className="flex gap-4 flex-wrap">
          {contactUrl && (
            <a href={contactUrl} className="font-medium hover:underline" style={{ color: "var(--menu-primary)" }}>
              Contacte-nos
            </a>
          )}
          {privacyUrl && (
            <a href={privacyUrl} className="font-medium hover:underline" style={{ color: "var(--menu-primary)" }}>
              Política de Privacidade
            </a>
          )}
        </div>
        {!footerText && !contactUrl && !privacyUrl && (
          <p className="m-0">© {storeName}</p>
        )}
      </footer>

      {/* FAB Speed Dial: secções, filtros, pesquisa, idioma, reservar */}
      <FabSpeedDial
        onOpenSections={handleOpenSections}
        onToggleCategories={() => setIsCategoriesPanelOpen((prev) => !prev)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenLanguage={handleOpenLanguage}
        onReserveTable={handleReserveTable}
        isCategoriesOpen={isCategoriesPanelOpen}
        isSearchOpen={isSearchOpen}
      />

      <BottomSheet
        open={sectionsSheetOpen}
        onClose={() => setSectionsSheetOpen(false)}
        title="Secções"
        ariaLabel="Escolher secção do menu"
      >
        <ul className="list-none p-4 m-0 space-y-1">
          {(menu.sections ?? []).map((sec) => (
            <li key={sec.id}>
              <button
                type="button"
                className="w-full text-left py-3 px-4 rounded-lg hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 min-h-[44px]"
                onClick={() => handleSelectSection(sec.id)}
              >
                {sec.name}
              </button>
            </li>
          ))}
          {(!menu.sections || menu.sections.length === 0) && (
            <li className="py-3 text-gray-500 text-sm">Nenhuma secção disponível.</li>
          )}
        </ul>
      </BottomSheet>

      <BottomSheet
        open={languageSheetOpen}
        onClose={() => setLanguageSheetOpen(false)}
        title="Idioma"
        ariaLabel="Escolher idioma"
      >
        <div className="p-4">
          <p className="text-gray-600 text-sm mb-4">Em breve poderá escolher o idioma aqui.</p>
          <ul className="list-none m-0 space-y-1">
            <li>
              <button
                type="button"
                className="w-full text-left py-3 px-4 rounded-lg hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 min-h-[44px] disabled:opacity-60"
                disabled
              >
                Português
              </button>
            </li>
            <li>
              <button
                type="button"
                className="w-full text-left py-3 px-4 rounded-lg hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 min-h-[44px] disabled:opacity-60"
                disabled
              >
                English
              </button>
            </li>
          </ul>
        </div>
      </BottomSheet>
    </div>
  );
}

export const BWB_BRANCO_KEY = DEFAULT_TEMPLATE_KEY;
