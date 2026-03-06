"use client";

import { useState, useMemo } from "react";
import type { PublicMenuPayload, PublicMenuItem } from "@/lib/supabase";
import { MenuIcon } from "../menu-icons";

function formatPrice(value: number, currencyCode?: string): string {
  const formatted = value.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const code = (currencyCode || "€").trim();
  return code === "€" || code === "EUR" ? `${formatted} €` : `${formatted} ${code}`;
}

export function ItemCard({ item, currencyCode }: { item: PublicMenuItem; currencyCode?: string }) {
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const imageSrc =
    item.image_path != null && item.image_path !== ""
      ? process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") + "/storage/v1/object/public/" + item.image_path
      : item.image_url ?? null;

  return (
    <li
      style={{
        borderBottom: "1px solid #eee",
        padding: "0.75rem 0",
        listStyle: "none",
      }}
    >
      {imageSrc && (
        <div style={{ marginBottom: "0.5rem" }}>
          <img
            src={imageSrc}
            alt={item.menu_name ?? ""}
            style={{ maxWidth: "100%", height: "auto", borderRadius: "8px", maxHeight: "280px", objectFit: "cover" }}
          />
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 60%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{item.menu_name}</span>
            {item.is_featured && (
              <span style={{ fontSize: "0.75rem", color: "#c00" }}>em destaque</span>
            )}
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              {item.article_type && <MenuIcon code={item.article_type.icon_code} size={22} />}
              {item.is_promotion && <MenuIcon code="percent" size={22} />}
              {item.take_away && <MenuIcon code="vehicle" size={22} />}
            </span>
          </div>
          {item.menu_description && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "#555" }}>{item.menu_description}</p>
          )}
          <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            {item.prep_minutes != null && (
              <span style={{ fontSize: "0.85rem", color: "#666" }}>⏱ {item.prep_minutes}&apos;</span>
            )}
            {(item.menu_ingredients != null && item.menu_ingredients.trim() !== "") && (
              <button
                type="button"
                onClick={() => setIngredientsOpen((o) => !o)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "0.9rem",
                  color: "#555",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                Ingredientes <span style={{ fontWeight: "bold" }}>{ingredientsOpen ? "−" : "+"}</span>
              </button>
            )}
          </div>
          {ingredientsOpen && item.menu_ingredients && (
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", color: "#555", whiteSpace: "pre-wrap" }}>
              {item.menu_ingredients}
            </p>
          )}
          {item.allergens?.length > 0 && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#888" }}>
              Alergénios: {item.allergens.map((a) => a.code).join(", ")}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right", flex: "0 0 auto" }}>
          {item.is_promotion && item.price_old != null && (
            <div style={{ textDecoration: "line-through", fontSize: "0.9rem", color: "#888" }}>
              {formatPrice(item.price_old, currencyCode)}
            </div>
          )}
          {item.menu_price != null && (
            <div style={{ fontWeight: "bold", fontSize: item.is_promotion ? "1.1rem" : "1rem", color: item.is_promotion ? "#b8860b" : "inherit" }}>
              {formatPrice(item.menu_price, currencyCode)}
            </div>
          )}
        </div>
      </div>
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

  return (
    <div>
      <header style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {menu.store_settings?.logo_url ? (
            <img src={menu.store_settings.logo_url} alt={storeName} style={{ maxHeight: "48px", width: "auto", objectFit: "contain" }} />
          ) : (
            <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{storeName}</h1>
          )}
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600, color: "#333" }}>Nossos Menus</h2>
        </div>
        <button
          type="button"
          onClick={() => (reservationUrl ? window.open(reservationUrl, "_blank") : setReservationModalOpen(true))}
          style={{
            padding: "0.5rem 1rem",
            background: "#8b6914",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reservar uma mesa
        </button>
      </header>

      {reservationModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reservation-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setReservationModalOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              padding: "1.5rem",
              borderRadius: "8px",
              maxWidth: "24rem",
              width: "90%",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="reservation-modal-title" style={{ marginTop: 0 }}>Reservar uma mesa</h3>
            <p style={{ color: "#555", fontSize: "0.9rem" }}>
              Em breve poderá efectuar a sua reserva aqui. Entretanto, contacte-nos directamente.
            </p>
            <button
              type="button"
              onClick={() => setReservationModalOpen(false)}
              style={{ padding: "0.35rem 0.75rem", marginTop: "0.5rem" }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {heroText && (
        <section style={{ marginBottom: "1.5rem", padding: "1rem", background: "#f8f8f8", borderRadius: "8px", color: "#444" }}>
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{heroText}</p>
        </section>
      )}

      {featuredItems.length > 0 && (
        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem", color: "#8b6914" }}>Escolhas do Chefe</h2>
          <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
            {featuredItems.map((item) => (
              <ItemCard key={item.id} item={item} currencyCode={currencyCode} />
            ))}
          </ul>
        </section>
      )}

      <section style={{ marginBottom: "1.5rem" }}>
        <div style={{ marginBottom: "0.75rem", overflowX: "auto", display: "flex", gap: "0.35rem", flexWrap: "nowrap", paddingBottom: "0.25rem" }}>
          <button
            type="button"
            onClick={() => setCategoryFilter("")}
            style={{
              padding: "0.4rem 0.75rem",
              border: "1px solid #ccc",
              borderRadius: "6px",
              background: categoryFilter === "" ? "#8b6914" : "#fff",
              color: categoryFilter === "" ? "#fff" : "#333",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            TUDO
          </button>
          {categoryOptions.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id)}
              style={{
                padding: "0.4rem 0.75rem",
                border: "1px solid #ccc",
                borderRadius: "6px",
                background: categoryFilter === c.id ? "#8b6914" : "#fff",
                color: categoryFilter === c.id ? "#fff" : "#333",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
            Base prato
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ padding: "0.35rem 0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
            >
              <option value="">TUDO</option>
              {typeOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontSize: "0.9rem" }}>
            <input type="checkbox" checked={togglePromo} onChange={(e) => setTogglePromo(e.target.checked)} />
            Promoções
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontSize: "0.9rem" }}>
            <input type="checkbox" checked={toggleTakeAway} onChange={(e) => setToggleTakeAway(e.target.checked)} />
            Take-away
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontSize: "0.9rem" }}>
            <input type="checkbox" checked={toggleFeatured} onChange={(e) => setToggleFeatured(e.target.checked)} />
            Em destaque
          </label>
          <button
            type="button"
            onClick={() => { setCategoryFilter(""); setTypeFilter(""); setTogglePromo(false); setToggleTakeAway(false); setToggleFeatured(false); }}
            style={{ padding: "0.35rem 0.75rem", border: "1px solid #999", borderRadius: "4px", background: "#f0f0f0", cursor: "pointer" }}
          >
            Limpar
          </button>
        </div>
      </section>

      <nav style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#666" }} aria-label="Breadcrumb">
        HOME
        {storeName && ` / ${storeName}`}
        {currentSectionName && ` / ${currentSectionName}`}
      </nav>

      {filteredCategories.length === 0 ? (
        <p style={{ color: "#666" }}>Nenhum item corresponde aos filtros.</p>
      ) : (
        categoriesBySection.map((group) => (
          <div key={group.sectionId ?? "_none"} style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "#333", borderBottom: "2px solid #8b6914", paddingBottom: "0.35rem" }}>
              {group.sectionName}
            </h2>
            {group.categories.map((cat) => (
              <section key={cat.id} style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "1.25rem", marginBottom: "0.5rem", color: "#8b6914" }}>
                  {cat.name}
                </h3>
                {cat.description && (
                  <p style={{ color: "#666", marginBottom: "0.75rem" }}>{cat.description}</p>
                )}
                <ul style={{ padding: 0, margin: 0 }}>
                  {cat.items?.map((item) => (
                    <ItemCard key={item.id} item={item} currencyCode={currencyCode} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ))
      )}

      <footer style={{ marginTop: "2.5rem", paddingTop: "1rem", borderTop: "1px solid #eee", fontSize: "0.9rem", color: "#666" }}>
        {footerText && (
          <div style={{ marginBottom: "0.5rem", whiteSpace: "pre-wrap" }}>{footerText}</div>
        )}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {contactUrl && (
            <a href={contactUrl} style={{ color: "#8b6914" }}>Contacte-nos</a>
          )}
          {privacyUrl && (
            <a href={privacyUrl} style={{ color: "#8b6914" }}>Política de Privacidade</a>
          )}
        </div>
        {!footerText && !contactUrl && !privacyUrl && (
          <p style={{ margin: 0 }}>© {storeName}</p>
        )}
      </footer>
    </div>
  );
}

export const BWB_BRANCO_KEY = DEFAULT_TEMPLATE_KEY;
