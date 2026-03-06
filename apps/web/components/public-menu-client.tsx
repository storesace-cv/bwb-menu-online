"use client";

import { useState, useMemo } from "react";
import type { PublicMenuPayload, PublicMenuCategory, PublicMenuItem } from "@/lib/supabase";
import { MenuIcon } from "./menu-icons";

function formatPrice(value: number, currencyCode?: string): string {
  const formatted = value.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const code = (currencyCode || "€").trim();
  return code === "€" || code === "EUR" ? `${formatted} €` : `${formatted} ${code}`;
}

function ItemCard({ item, currencyCode }: { item: PublicMenuItem; currencyCode?: string }) {
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

export function PublicMenuClient({ menu }: { menu: PublicMenuPayload }) {
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const currencyCode = menu.store_settings?.currency_code;
  const storeName = menu.store_settings?.store_display_name || menu.store_name || "Menu";

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
    return list;
  }, [menu.categories, categoryFilter, typeFilter]);

  const currentSectionName = useMemo(() => {
    const first = filteredCategories[0];
    return first?.section_name ?? null;
  }, [filteredCategories]);

  return (
    <div>
      <header style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        {menu.store_settings?.logo_url ? (
          <img src={menu.store_settings.logo_url} alt={storeName} style={{ maxHeight: "48px", width: "auto", objectFit: "contain" }} />
        ) : (
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{storeName}</h1>
        )}
      </header>

      <section style={{ marginBottom: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          Categoria
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: "0.35rem 0.5rem" }}
          >
            <option value="">TUDO</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          Tipo de artigo
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: "0.35rem 0.5rem" }}
          >
            <option value="">TUDO</option>
            {typeOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => { setCategoryFilter(""); setTypeFilter(""); }}
          style={{ padding: "0.35rem 0.75rem" }}
        >
          LIMPAR
        </button>
      </section>

      <nav style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#666" }} aria-label="Breadcrumb">
        HOME
        {storeName && ` / ${storeName}`}
        {currentSectionName && ` / ${currentSectionName}`}
      </nav>

      {filteredCategories.length === 0 ? (
        <p style={{ color: "#666" }}>Nenhum item corresponde aos filtros.</p>
      ) : (
        filteredCategories.map((cat) => (
          <section key={cat.id} style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem", color: "#8b6914" }}>
              {cat.name}
            </h2>
            {cat.description && (
              <p style={{ color: "#666", marginBottom: "0.75rem" }}>{cat.description}</p>
            )}
            <ul style={{ padding: 0, margin: 0 }}>
              {cat.items?.map((item) => (
                <ItemCard key={item.id} item={item} currencyCode={currencyCode} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
