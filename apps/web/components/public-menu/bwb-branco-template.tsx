"use client";

import { useState, useMemo, useEffect } from "react";
import type { PublicMenuPayload, PublicMenuItem } from "@/lib/supabase";
import { MenuIcon } from "../menu-icons";

const FALLBACK_PRIMARY = "#8b6914";

function formatPrice(value: number, currencyCode?: string): string {
  const formatted = value.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const code = (currencyCode || "€").trim();
  return code === "€" || code === "EUR" ? `${formatted} €` : `${formatted} ${code}`;
}

/** Modal: Zona 1 — imagem do artigo + ingredientes por baixo. */
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

export function ItemCard({ item, currencyCode }: { item: PublicMenuItem; currencyCode?: string }) {
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const imageSrc =
    item.image_path != null && item.image_path !== ""
      ? process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") + "/storage/v1/object/public/" + item.image_path
      : (item.image_url && item.image_url !== "") ? item.image_url : "/images/no_image_product.jpg";
  const hasIngredients = item.menu_ingredients != null && item.menu_ingredients.trim() !== "";

  return (
    <li className="list-none h-full flex">
      <article className="rounded-xl border border-gray-200 bg-white shadow-md overflow-hidden flex flex-col w-full h-full">
        {/* Zona 1 – Imagem do Artigo (clicável → modal com imagem + ingredientes) */}
        <button
            type="button"
            onClick={() => setImageModalOpen(true)}
            className="block w-full aspect-[4/3] overflow-hidden bg-gray-100 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-400"
            aria-label={`Ver imagem e ingredientes de ${item.menu_name ?? "artigo"}`}
          >
            <img
              src={imageSrc}
              alt={item.menu_name ?? ""}
              className="h-full w-full object-cover"
            />
          </button>
        <div className="p-4 flex flex-col flex-1 min-h-0">
          {/* Zona A – Ícones informativos, alinhados à direita */}
          <div className="flex justify-end items-center gap-1.5 flex-wrap min-h-[28px]">
            {item.is_featured && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                <MenuIcon code="on-promo" size={14} />
                em destaque
              </span>
            )}
            {item.article_type && <MenuIcon code={item.article_type.icon_code} size={22} className="shrink-0" />}
            {item.is_promotion && <MenuIcon code="on-promo" size={22} className="shrink-0" />}
            {item.take_away && <MenuIcon code="take-away" size={22} className="shrink-0" />}
          </div>
          {/* Zona B – Nome do artigo, à esquerda */}
          <h3 className="font-bold text-lg text-gray-900 text-left mt-1">{item.menu_name}</h3>
          {item.menu_description && (
            <p className="mt-1 text-gray-600 text-sm leading-relaxed text-left">{item.menu_description}</p>
          )}
          {/* Zona C – Ingredientes: "Ingredientes" à esquerda, "+" à direita; ao clicar expande */}
          <div className="mt-2">
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
              <div className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                {hasIngredients ? item.menu_ingredients : "—"}
              </div>
            )}
          </div>
          {/* Zona D – Tempo de Preparação (ícone + valor), à esquerda */}
          {item.prep_minutes != null && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
              <MenuIcon code="prep-time" size={18} />
              <span>{item.prep_minutes}&apos;</span>
            </div>
          )}
          {/* Zona E – Alergénicos, à esquerda */}
          {item.allergens && item.allergens.length > 0 && (
            <p className="mt-2 text-xs text-gray-500 text-left">
              Alergénios: {item.allergens.map((a) => a.code).join(", ")}
            </p>
          )}
          {/* Zonas F e G – Preço antigo (centro da sua zona) + Preço actual (direita) */}
          <div className={`mt-3 flex items-center gap-4 ${item.is_promotion && item.price_old != null ? "" : "justify-end"}`}>
            {item.is_promotion && item.price_old != null && (
              <div className="flex-1 min-w-0 text-center text-sm text-gray-400 line-through" aria-label="Preço antigo">
                {formatPrice(item.price_old, currencyCode)}
              </div>
            )}
            {item.menu_price != null && (
              <div
                className={`font-bold text-right shrink-0 ${item.is_promotion ? "text-lg text-amber-700" : "text-base text-gray-900"}`}
              >
                {formatPrice(item.menu_price, currencyCode)}
              </div>
            )}
          </div>
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

const DEFAULT_TEMPLATE_KEY = "bwb-branco";

function collectFeaturedItems(menu: PublicMenuPayload): PublicMenuItem[] {
  const out: PublicMenuItem[] = [];
  (menu.categories ?? []).forEach((cat) => {
    cat.items?.forEach((item) => {
      if (item.is_featured) out.push(item);
    });
  });
  return out;
}

export function BwbBrancoTemplate({ menu }: { menu: PublicMenuPayload }) {
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [togglePromo, setTogglePromo] = useState(false);
  const [toggleTakeAway, setToggleTakeAway] = useState(false);
  const [toggleFeatured, setToggleFeatured] = useState(false);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);

  const currencyCode = menu.store_settings?.currency_code;
  const storeName = menu.store_settings?.store_display_name || menu.store_name || "Menu";
  const heroText = menu.store_settings?.hero_text;
  const reservationUrl = menu.store_settings?.reservation_url;
  const footerText = menu.store_settings?.footer_text;
  const contactUrl = menu.store_settings?.contact_url;
  const privacyUrl = menu.store_settings?.privacy_url;
  const primaryColor = (menu.store_settings?.primary_color?.trim() || FALLBACK_PRIMARY) as string;

  const featuredItems = useMemo(() => collectFeaturedItems(menu), [menu]);

  const categoryOptions = useMemo(() => {
    const cats = menu.categories ?? [];
    return Array.from(new Map(cats.map((c) => [c.id, c])).values());
  }, [menu.categories]);

  const typeOptions = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; icon_code: string }>();
    (menu.categories ?? []).forEach((cat) => {
      cat.items?.forEach((item) => {
        if (item.article_type && !seen.has(item.article_type.id)) {
          seen.set(item.article_type.id, item.article_type);
        }
      });
    });
    return Array.from(seen.values());
  }, [menu.categories]);

  const filteredCategories = useMemo(() => {
    let list = menu.categories ?? [];
    if (categoryFilter) {
      list = list.filter((c) => c.id === categoryFilter);
    }
    if (typeFilter) {
      list = list.map((cat) => ({
        ...cat,
        items: cat.items?.filter((i) => i.article_type?.id === typeFilter) ?? [],
      })).filter((cat) => (cat.items?.length ?? 0) > 0);
    }
    if (togglePromo || toggleTakeAway || toggleFeatured) {
      list = list.map((cat) => ({
        ...cat,
        items: cat.items?.filter((i) => {
          if (togglePromo && !i.is_promotion) return false;
          if (toggleTakeAway && !i.take_away) return false;
          if (toggleFeatured && !i.is_featured) return false;
          return true;
        }) ?? [],
      })).filter((cat) => (cat.items?.length ?? 0) > 0);
    }
    return list;
  }, [menu.categories, categoryFilter, typeFilter, togglePromo, toggleTakeAway, toggleFeatured]);

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

  const clearFilters = () => {
    setCategoryFilter("");
    setTypeFilter("");
    setTogglePromo(false);
    setToggleTakeAway(false);
    setToggleFeatured(false);
  };

  return (
    <div
      className="menu-public-contents"
      style={
        {
          "--menu-primary": primaryColor,
          "--menu-primary-foreground": "#fff",
        } as React.CSSProperties
      }
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
          <h2 className="m-0 text-xl font-semibold text-gray-700">Nossos Menus</h2>
        </div>
        <button
          type="button"
          onClick={() => (reservationUrl ? window.open(reservationUrl, "_blank") : setReservationModalOpen(true))}
          className="px-5 py-2.5 rounded-lg font-semibold text-white cursor-pointer transition-opacity hover:opacity-90 shadow-md"
          style={{ backgroundColor: "var(--menu-primary)" }}
        >
          Reservar uma mesa
        </button>
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

      {/* Escolhas do Chefe */}
      {featuredItems.length > 0 && (
        <section className="mb-8">
          <h2
            className="text-xl font-semibold mb-4 pb-2 border-b-2"
            style={{ borderColor: "var(--menu-primary)", color: "var(--menu-primary)" }}
          >
            Escolhas do Chefe
          </h2>
          <ul className="p-0 m-0 list-none grid grid-cols-1 sm:grid-cols-2 gap-6">
            {featuredItems.map((item) => (
              <ItemCard key={item.id} item={item} currencyCode={currencyCode} />
            ))}
          </ul>
        </section>
      )}

      {/* Filters: category tabs + chips */}
      <section className="mb-6">
        <div className="mb-3 p-2 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Categorias</p>
          <div className="overflow-x-auto flex gap-2 flex-nowrap pb-1">
            <button
              type="button"
              onClick={() => setCategoryFilter("")}
              className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer border transition-colors"
              style={
                categoryFilter === ""
                  ? { backgroundColor: "var(--menu-primary)", color: "var(--menu-primary-foreground)", borderColor: "var(--menu-primary)" }
                  : { backgroundColor: "#fff", color: "#374151", borderColor: "#d1d5db" }
              }
            >
              TUDO
            </button>
            {categoryOptions.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryFilter(c.id)}
                className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer border transition-colors"
                style={
                  categoryFilter === c.id
                    ? { backgroundColor: "var(--menu-primary)", color: "var(--menu-primary-foreground)", borderColor: "var(--menu-primary)" }
                    : { backgroundColor: "#fff", color: "#374151", borderColor: "#d1d5db" }
                }
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            Base prato
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="py-2 pl-3 pr-8 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
            >
              <option value="">TUDO</option>
              {typeOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setTogglePromo(!togglePromo)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer transition-colors ${
              togglePromo ? "text-white border-transparent" : "bg-white text-gray-600 border-gray-300"
            }`}
            style={togglePromo ? { backgroundColor: "var(--menu-primary)" } : undefined}
          >
            Promoções
          </button>
          <button
            type="button"
            onClick={() => setToggleTakeAway(!toggleTakeAway)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer transition-colors ${
              toggleTakeAway ? "text-white border-transparent" : "bg-white text-gray-600 border-gray-300"
            }`}
            style={toggleTakeAway ? { backgroundColor: "var(--menu-primary)" } : undefined}
          >
            Take-away
          </button>
          <button
            type="button"
            onClick={() => setToggleFeatured(!toggleFeatured)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer transition-colors ${
              toggleFeatured ? "text-white border-transparent" : "bg-white text-gray-600 border-gray-300"
            }`}
            style={toggleFeatured ? { backgroundColor: "var(--menu-primary)" } : undefined}
          >
            Em destaque
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 cursor-pointer"
          >
            Limpar
          </button>
        </div>
      </section>

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
          <div key={group.sectionId ?? "_none"} className="mb-10">
            <h2
              className="text-xl font-semibold mb-4 pb-2 border-b-2 text-gray-900"
              style={{ borderColor: "var(--menu-primary)" }}
            >
              {group.sectionName}
            </h2>
            {group.categories.map((cat) => (
              <section key={cat.id} className="mb-8">
                <h3 className="text-lg font-semibold mb-2 text-gray-800" style={{ color: "var(--menu-primary)" }}>
                  {cat.name}
                </h3>
                {cat.description && (
                  <p className="text-gray-600 text-sm mb-4">{cat.description}</p>
                )}
                <ul className="p-0 m-0 list-none grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {cat.items?.map((item) => (
                    <ItemCard key={item.id} item={item} currencyCode={currencyCode} />
                  ))}
                </ul>
              </section>
            ))}
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
    </div>
  );
}

export const BWB_BRANCO_KEY = DEFAULT_TEMPLATE_KEY;
