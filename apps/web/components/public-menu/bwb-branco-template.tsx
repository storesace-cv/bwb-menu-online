"use client";

import type { ComponentType } from "react";
import React, { useState, useMemo, useRef, useEffect } from "react";
import type { PublicMenuPayload, PublicMenuInitialPayload, PublicMenuItem, PublicMenuCategory } from "@/lib/supabase";
import type { LayoutDefinition } from "@/lib/presentation-templates";
import { getPresentationCardComponent, DEFAULT_PRESENTATION_KEY } from "@/lib/presentation-templates";
import { ItemCardFromLayout } from "./item-card-from-layout";
import { FeaturedCarouselSection } from "./featured-carousel-section";
import { FabSpeedDial } from "./fab-speed-dial";
import { BottomSheet } from "./bottom-sheet";
import { MenuFooterSection } from "./menu-footer-section";
import { scrollToSection } from "@/lib/scroll-to-section";
import { buildBackgroundStyle } from "@/lib/parse-css-declarations";

const FALLBACK_PRIMARY = "#8b6914";

const ROW_CARDS_SUBGRID_ROWS = 8;

/** Largura mínima por card em tablet/desktop (base do layout em 2 colunas). Usada em repeat(auto-fill, minmax(…, 1fr)) para colocar tantos cards por linha quantos couberem. */
const CARD_MIN_WIDTH_PX = 360;

/** Uma linha de 2 cards usando o componente de apresentação escolhido ou layout. Em 2 colunas usa subgrid para alinhar as zonas (Ingredientes, tempo, alergénios, preço) entre os dois cartões. */
function RowCards({
  items,
  currencyCode,
  CardComponent,
  layoutDefinition,
  imageSource,
}: {
  items: [PublicMenuItem, PublicMenuItem | null];
  currencyCode?: string;
  CardComponent: ComponentType<{ item: PublicMenuItem; currencyCode?: string; imageSource?: string; inRowCards?: boolean }>;
  layoutDefinition?: LayoutDefinition | null;
  imageSource?: string;
}) {
  const [left, right] = items;
  const useLayout = layoutDefinition != null && Array.isArray(layoutDefinition.zoneOrder) && layoutDefinition.zoneOrder.length > 0;

  if (useLayout) {
    return (
      <div className="grid grid-cols-2 gap-6">
        <ItemCardFromLayout item={left} layoutDefinition={layoutDefinition} currencyCode={currencyCode} imageSource={imageSource} />
        {right ? (
          <ItemCardFromLayout item={right} layoutDefinition={layoutDefinition} currencyCode={currencyCode} imageSource={imageSource} />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50 min-h-[200px]" aria-hidden />
        )}
      </div>
    );
  }

  const leftResult = (
    <CardComponent item={left} currencyCode={currencyCode} imageSource={imageSource} inRowCards />
  );
  const leftArr = React.Children.toArray(leftResult);
  const leftZones = leftArr.slice(0, ROW_CARDS_SUBGRID_ROWS);
  const leftModals = leftArr.slice(ROW_CARDS_SUBGRID_ROWS);

  const rightResult = right ? (
    <CardComponent item={right} currencyCode={currencyCode} imageSource={imageSource} inRowCards />
  ) : null;
  const rightArr = rightResult ? React.Children.toArray(rightResult) : [];
  const rightZones = rightArr.slice(0, ROW_CARDS_SUBGRID_ROWS);
  const rightModals = rightArr.slice(ROW_CARDS_SUBGRID_ROWS);

  return (
    <>
      <div
        className="grid gap-6"
        style={{
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: `repeat(${ROW_CARDS_SUBGRID_ROWS}, auto)`,
        }}
      >
        <div
          className="min-w-0 rounded-xl border border-gray-200 bg-white shadow-md overflow-hidden"
          style={{ gridRow: "1 / -1", display: "grid", gridTemplateRows: "subgrid" }}
        >
          {leftZones}
        </div>
        {right ? (
          <div
            className="min-w-0 rounded-xl border border-gray-200 bg-white shadow-md overflow-hidden"
            style={{ gridRow: "1 / -1", display: "grid", gridTemplateRows: "subgrid" }}
          >
            {rightZones}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50 min-h-[200px]" aria-hidden style={{ gridRow: "1 / -1" }} />
        )}
      </div>
      {leftModals}
      {rightModals}
    </>
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

/** Normaliza texto para pesquisa: lowercase e remove acentos (compatível com target ES5). */
function normalizeForSearch(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Indica se o item faz match na pesquisa (menu_name, menu_description). */
function itemMatchesSearch(item: PublicMenuItem, queryNorm: string): boolean {
  if (!queryNorm) return true;
  const name = normalizeForSearch(item.menu_name ?? "");
  const desc = normalizeForSearch(item.menu_description ?? "");
  return name.includes(queryNorm) || desc.includes(queryNorm);
}

/** Lazy load de secções: extraSectionCategories guarda categorias carregadas por sectionId; ao escolher secção faz fetch e scroll quando o bloco existir. */
export function BwbBrancoTemplate({ menu }: { menu: PublicMenuInitialPayload | PublicMenuPayload }) {
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [isCategoriesPanelOpen, setIsCategoriesPanelOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sectionsSheetOpen, setSectionsSheetOpen] = useState(false);
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const [extraSectionCategories, setExtraSectionCategories] = useState<Record<string, PublicMenuCategory[]>>({});
  const [pendingScrollSectionId, setPendingScrollSectionId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(() =>
    (menu.sections?.length ? menu.sections[0].id : null)
  );
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [loadingSectionId, setLoadingSectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currencyCode = menu.store_settings?.currency_code ?? "€";
  const storeName = menu.store_settings?.store_display_name || menu.store_name || "Menu";
  const heroText = menu.store_settings?.hero_text;
  const heroBackgroundColor = menu.store_settings?.hero_background_color?.trim();
  const heroBackgroundCss = menu.store_settings?.hero_background_css?.trim();
  const heroLogoUrl = menu.store_settings?.logo_url;
  const logoFillColor = menu.store_settings?.logo_fill_color?.trim();
  const logoStrokeColor = menu.store_settings?.logo_stroke_color?.trim();
  const reservationUrl = menu.store_settings?.reservation_url;
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

  const filteredCategories = useMemo(() => {
    const sections = menu.sections ?? [];
    const initial = menu.categories ?? [];
    const result: PublicMenuCategory[] = [];
    for (const sec of sections) {
      const fromInitial = initial.filter((c) => c.section_id === sec.id);
      const fromExtra = extraSectionCategories[sec.id] ?? [];
      if (fromInitial.length) result.push(...fromInitial);
      else if (fromExtra.length) result.push(...fromExtra);
    }
    const noSection = initial.filter((c) => !c.section_id);
    if (noSection.length) result.push(...noSection);
    return result;
  }, [menu.sections, menu.categories, extraSectionCategories]);

  const categoriesBySection = useMemo(() => {
    const sections = menu.sections ?? [];
    const withItems = (c: PublicMenuCategory) => (c.items?.length ?? 0) > 0;
    const result: { sectionId: string | null; sectionName: string; categories: typeof filteredCategories }[] = [];
    if (sections.length === 0) {
      const cats = filteredCategories.filter(withItems);
      if (cats.length > 0) {
        result.push({ sectionId: null, sectionName: "Menu", categories: cats });
      }
      return result;
    }
    for (const sec of sections) {
      const cats = filteredCategories.filter((c) => c.section_id === sec.id && withItems(c));
      if (cats.length > 0) {
        result.push({ sectionId: sec.id, sectionName: sec.name, categories: cats });
      }
    }
    const uncategorized = filteredCategories.filter((c) => !c.section_id && withItems(c));
    if (uncategorized.length > 0) {
      result.push({ sectionId: null, sectionName: "Outros", categories: uncategorized });
    }
    return result;
  }, [menu.sections, filteredCategories]);

  const firstSectionId = (menu.sections ?? [])[0]?.id ?? null;
  const sectionHasItems = useMemo(() => {
    const out: Record<string, boolean> = {};
    const initial = menu.categories ?? [];
    for (const sec of menu.sections ?? []) {
      const cats =
        sec.id === firstSectionId
          ? initial.filter((c) => c.section_id === sec.id)
          : extraSectionCategories[sec.id] ?? [];
      const hasData = sec.id === firstSectionId || sec.id in extraSectionCategories;
      out[sec.id] = hasData ? cats.some((c) => (c.items?.length ?? 0) > 0) : true;
    }
    return out;
  }, [menu.sections, menu.categories, firstSectionId, extraSectionCategories]);

  const currentSectionName = useMemo(() => {
    const norm = (id: string | null) => id ?? "none";
    const activeNorm = norm(activeSectionId);
    const group = categoriesBySection.find((g) => norm(g.sectionId) === activeNorm);
    if (group) return group.sectionName;
    const sec = (menu.sections ?? []).find((s) => s.id === activeSectionId);
    return sec?.name ?? null;
  }, [activeSectionId, categoriesBySection, menu.sections]);

  /** Categorias da secção activa com itens filtrados por searchQuery; categorias vazias ocultas quando há query. */
  const activeSectionFilteredCategories = useMemo(() => {
    const norm = (id: string | null) => id ?? "none";
    const activeNorm = norm(activeSectionId);
    const activeGroup = categoriesBySection.find((g) => norm(g.sectionId) === activeNorm);
    if (!activeGroup) return [];
    const q = normalizeForSearch(searchQuery);
    if (!q) return activeGroup.categories;
    return activeGroup.categories
      .map((cat) => ({
        ...cat,
        items: (cat.items ?? []).filter((item) => itemMatchesSearch(item, q)),
      }))
      .filter((cat) => (cat.items?.length ?? 0) > 0);
  }, [categoriesBySection, activeSectionId, searchQuery]);

  useEffect(() => {
    if (isSearchOpen) {
      const t = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(t);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (pendingScrollSectionId == null) return;
    const id = pendingScrollSectionId;
    const el = document.getElementById(`section-${id}`);
    if (el) {
      const t = setTimeout(() => {
        scrollToSection(`section-${id}`);
        setPendingScrollSectionId(null);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [pendingScrollSectionId, filteredCategories]);

  const handleOpenSections = () => setSectionsSheetOpen(true);

  /** Fetch categorias de uma secção (lazy load). Retorna true se já tinha dados ou carregou com sucesso. */
  const ensureSectionCategoriesLoaded = async (sectionId: string | null): Promise<boolean> => {
    const id = sectionId ?? "none";
    const sections = menu.sections ?? [];
    const initial = menu.categories ?? [];
    const alreadyHaveSection =
      id === "none"
        ? initial.some((c) => !c.section_id)
        : initial.some((c) => c.section_id === id) || (extraSectionCategories[id]?.length ?? 0) > 0;
    if (alreadyHaveSection) return true;
    if (id === "none") return false;
    setLoadingSectionId(id);
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    const params = new URLSearchParams({ host, sectionId: id, currencyCode: currencyCode ?? "" });
    try {
      const res = await fetch(`/api/public-menu/section-categories?${params}`);
      if (!res.ok) return false;
      const { categories } = (await res.json()) as { categories: PublicMenuCategory[] };
      if (Array.isArray(categories) && categories.length > 0) {
        setExtraSectionCategories((prev) => ({ ...prev, [id]: categories }));
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setLoadingSectionId(null);
    }
  };

  const handleSelectSection = async (sectionId: string | null) => {
    const id = sectionId ?? "none";
    setSectionsSheetOpen(false);
    setActiveSectionId(sectionId);
    setExpandedCategoryId(null);
    setSearchQuery("");
    const ok = await ensureSectionCategoriesLoaded(sectionId);
    if (ok) setPendingScrollSectionId(id);
  };

  const handleExpandCategory = (categoryId: string) => {
    setExpandedCategoryId((prev) => (prev === categoryId ? null : categoryId));
  };

  const handleOpenLanguage = () => setLanguageSheetOpen(true);
  // TODO: idioma — funcionalidade futura; por agora só UI "Em breve".
  const handleReserveTable = () => setReservationModalOpen(true);

  // suppressHydrationWarning: tolera alterações ao DOM por extensões do browser (ex.: token-signing) que provocam mismatch de hidratação (#418/#423); conteúdo final é equivalente.
  return (
    <div
      className="menu-public-contents min-w-0 max-w-full overflow-x-visible"
      style={
        {
          "--menu-primary": primaryColor,
          "--menu-primary-foreground": "#fff",
        } as React.CSSProperties
      }
      suppressHydrationWarning
    >
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
            className="bg-white p-6 rounded-xl w-[90%] max-w-[min(400px,90vw)] md:max-w-[min(400px,25vw)] shadow-xl"
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

      {/* Hero (logo + text banner) */}
      {(heroLogoUrl || heroText) && (
        <section
          className="p-4 rounded-xl text-gray-800 text-center flex flex-col items-center justify-center"
          style={buildBackgroundStyle(heroBackgroundColor, heroBackgroundCss, { backgroundColor: "color-mix(in srgb, var(--menu-primary) 12%, white)" })}
        >
          {heroLogoUrl ? (
            <img
              src={
                (logoFillColor || logoStrokeColor) && heroLogoUrl.toLowerCase().includes(".svg")
                  ? `/api/public-menu/logo?url=${encodeURIComponent(heroLogoUrl)}${logoFillColor ? `&fill=${encodeURIComponent(logoFillColor)}` : ""}${logoStrokeColor ? `&stroke=${encodeURIComponent(logoStrokeColor)}` : ""}`
                  : heroLogoUrl
              }
              alt={storeName}
              className="max-h-[50px] w-auto object-contain"
            />
          ) : null}
          {heroText ? (
            <p className="m-0 text-lg leading-relaxed whitespace-pre-wrap">{heroText}</p>
          ) : null}
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
        titleAlign={sectionTitleAlign}
        titleMarginBottom={sectionTitleMarginBottom}
        titlePaddingTop={sectionTitlePaddingTop}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500" aria-label="Breadcrumb">
        HOME
        {storeName && ` / ${storeName}`}
        {currentSectionName && ` / ${currentSectionName}`}
      </nav>

      {/* Sections: uma secção activa; categorias em accordion (colapsadas por defeito, fa-eye no cabeçalho) */}
      {filteredCategories.length === 0 ? (
        <p className="text-gray-600">Nenhum item corresponde aos filtros.</p>
      ) : (
        (() => {
          const norm = (sid: string | null) => sid ?? "none";
          const activeNorm = norm(activeSectionId);
          const activeGroup = categoriesBySection.find((g) => norm(g.sectionId) === activeNorm);
          if (!activeGroup) {
            return (
              <p className="text-gray-600" id={`section-${activeNorm}`}>
                A carregar…
              </p>
            );
          }
          if (activeSectionFilteredCategories.length === 0) {
            return (
              <p className="text-gray-600" id={`section-${activeGroup.sectionId ?? "none"}`}>
                Nenhum item corresponde aos filtros.
              </p>
            );
          }
          const group = activeGroup;
          const section = (menu.sections ?? []).find((s) => s.id === group.sectionId);
          const sectionStyle =
            section && (section.background_color || section.background_css)
              ? buildBackgroundStyle(section.background_color, section.background_css)
              : undefined;
          const sectionAlignClass =
            sectionTitleAlign === "left" ? "text-left" : sectionTitleAlign === "right" ? "text-right" : "text-center";
          const categoryAlignClass =
            categoryTitleAlign === "left" ? "text-left" : categoryTitleAlign === "right" ? "text-right" : "text-center";
          const h1El = (
            <h1
              className={`section-title mt-0 ${sectionAlignClass}`}
              style={{
                marginBottom: `${sectionTitleMarginBottom}px`,
                paddingTop: `${sectionTitlePaddingTop}px`,
                ...(sectionTitleColor ? { color: sectionTitleColor } : {}),
              }}
            >
              {group.sectionName}
            </h1>
          );
          return (
            <div key={group.sectionId ?? "_none"} id={`section-${group.sectionId ?? "none"}`} className="mb-10">
              {sectionStyle ? (
                <div style={sectionStyle} className="rounded-xl p-4">
                  {h1El}
                </div>
              ) : (
                h1El
              )}
              <div className="space-y-2">
                {activeSectionFilteredCategories.map((cat) => {
                  const isExpanded = expandedCategoryId === cat.id;
                  return (
                    <section key={cat.id} className="mb-4" style={{ marginLeft: `${categoryTitleIndentPx}px` }}>
                      <button
                        type="button"
                        onClick={() => handleExpandCategory(cat.id)}
                        aria-expanded={isExpanded}
                        aria-controls={`category-content-${cat.id}`}
                        id={`category-${cat.id}`}
                        className={`category-title w-full flex items-center gap-[0.4em] min-h-[44px] mt-0 border-0 bg-transparent cursor-pointer rounded-xl p-2 -m-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 ${categoryAlignClass}`}
                        style={{
                          marginBottom: `${categoryTitleMarginBottom}px`,
                          paddingTop: `${categoryTitlePaddingTop}px`,
                          color: categoryTitleColor,
                        }}
                      >
                        <i className="fas fa-eye flex-shrink-0" style={{ fontSize: "1em" }} aria-hidden />
                        <span className="mt-0">{cat.name}</span>
                      </button>
                      {isExpanded && (
                        <div
                          id={`category-content-${cat.id}`}
                          role="region"
                          aria-labelledby={`category-${cat.id}`}
                        >
                          {cat.description && (
                            <p className="text-gray-600 text-sm mb-4">{cat.description}</p>
                          )}
                          <div className="block sm:hidden">
                            <ul className="p-0 m-0 list-none grid grid-cols-1 gap-6">
                              {(cat.items ?? []).map((item) => {
                                const layoutDef = cat.presentation_layout_definition;
                                const useLayout =
                                  layoutDef != null &&
                                  Array.isArray(layoutDef.zoneOrder) &&
                                  layoutDef.zoneOrder.length > 0;
                                const CardComponent = getPresentationCardComponent(cat.presentation_component_key);
                                return useLayout ? (
                                  <ItemCardFromLayout
                                    key={item.id}
                                    item={item}
                                    layoutDefinition={layoutDef as LayoutDefinition}
                                    currencyCode={currencyCode}
                                    imageSource={imageSource}
                                  />
                                ) : (
                                  <CardComponent
                                    key={item.id}
                                    item={item}
                                    currencyCode={currencyCode}
                                    imageSource={imageSource}
                                  />
                                );
                              })}
                            </ul>
                          </div>
                          <div className="hidden sm:block">
                            <ul
                              className="p-0 m-0 list-none grid gap-6"
                              style={{
                                gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_MIN_WIDTH_PX}px, 1fr))`,
                              }}
                            >
                              {(cat.items ?? []).map((item) => {
                                const layoutDef = cat.presentation_layout_definition;
                                const useLayout =
                                  layoutDef != null &&
                                  Array.isArray(layoutDef.zoneOrder) &&
                                  layoutDef.zoneOrder.length > 0;
                                const CardComponent = getPresentationCardComponent(cat.presentation_component_key);
                                return (
                                  <li key={item.id} className="list-none">
                                    {useLayout ? (
                                      <ItemCardFromLayout
                                        item={item}
                                        layoutDefinition={layoutDef as LayoutDefinition}
                                        currencyCode={currencyCode}
                                        imageSource={imageSource}
                                      />
                                    ) : (
                                      <CardComponent
                                        item={item}
                                        currencyCode={currencyCode}
                                        imageSource={imageSource}
                                      />
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
          );
        })()
      )}

      {/* Footer */}
      <MenuFooterSection
        footer={{
          logo_url: menu.store_settings?.footer_logo_url,
          logo_fill_color: menu.store_settings?.footer_logo_fill_color?.trim() || undefined,
          logo_stroke_color: menu.store_settings?.footer_logo_stroke_color?.trim() || undefined,
          address: menu.store_settings?.footer_address,
          email: menu.store_settings?.footer_email,
          phone: menu.store_settings?.footer_phone,
          background_color: menu.store_settings?.footer_background_color,
          background_css: menu.store_settings?.footer_background_css,
          text_color: menu.store_settings?.footer_text_color,
        }}
      />
      {(contactUrl || privacyUrl) && (
        <div className="mt-3 flex gap-4 flex-wrap text-sm">
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
      )}

      {/* FAB Speed Dial: menus, filtros, pesquisa, idioma, reservar */}
      <FabSpeedDial
        onOpenSections={handleOpenSections}
        onToggleCategories={() => setIsCategoriesPanelOpen((prev) => !prev)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenLanguage={handleOpenLanguage}
        onReserveTable={handleReserveTable}
        isCategoriesOpen={isCategoriesPanelOpen}
        isSearchOpen={isSearchOpen}
        languageDisabled
        reserveDisabled
      />

      <BottomSheet
        open={sectionsSheetOpen}
        onClose={() => setSectionsSheetOpen(false)}
        title="Menus"
        ariaLabel="Escolher secção do menu"
      >
        <ul className="list-none p-4 m-0 space-y-1">
          {(menu.sections ?? []).map((sec) => {
            const disabled = sectionHasItems[sec.id] === false;
            return (
              <li key={sec.id}>
                <button
                  type="button"
                  disabled={disabled}
                  aria-disabled={disabled}
                  className={`w-full text-left py-3 px-4 rounded-lg min-h-[44px] focus:outline-none focus:ring-2 focus:ring-gray-400 ${disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-100 focus:bg-gray-100"}`}
                  onClick={() => !disabled && handleSelectSection(sec.id)}
                >
                  {sec.name}
                </button>
              </li>
            );
          })}
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
