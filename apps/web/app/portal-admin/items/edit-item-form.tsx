"use client";

import { useFormState } from "react-dom";
import { updateMenuItem } from "../actions";

type ArticleType = { id: string; name: string; icon_code: string };

type MenuItem = {
  id: string;
  menu_name: string;
  menu_description: string | null;
  menu_price: number | null;
  sort_order: number;
  article_type_id: string | null;
  is_promotion: boolean;
  price_old: number | null;
  take_away: boolean;
  menu_ingredients: string | null;
  is_visible: boolean;
  is_featured: boolean;
};

export function EditItemForm({ item, articleTypes }: { item: MenuItem; articleTypes: ArticleType[] }) {
  const [state, formAction] = useFormState(updateMenuItem, null);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "32rem" }}>
      <input type="hidden" name="id" value={item.id} />
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <label>
          Nome * <input name="menu_name" type="text" required defaultValue={item.menu_name} placeholder="ex: Bifana" />
        </label>
        <label>
          Descrição <input name="menu_description" type="text" defaultValue={item.menu_description ?? ""} placeholder="Breve descrição" />
        </label>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <label>
          Preço <input name="menu_price" type="number" step="0.01" min={0} placeholder="0.00" defaultValue={item.menu_price ?? ""} />
        </label>
        <label>
          Tipo de artigo{" "}
          <select name="article_type_id" defaultValue={item.article_type_id ?? ""}>
            <option value="">Nenhum</option>
            {articleTypes.map((at) => (
              <option key={at.id} value={at.id}>{at.name}</option>
            ))}
          </select>
        </label>
        <label>
          Ordem <input name="sort_order" type="number" defaultValue={item.sort_order} style={{ width: "4rem" }} />
        </label>
      </div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <input type="checkbox" name="is_promotion" value="1" defaultChecked={item.is_promotion} />
          Em promoção
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          Preço antigo <input name="price_old" type="number" step="0.01" min={0} placeholder="0.00" style={{ width: "5rem" }} defaultValue={item.price_old ?? ""} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <input type="checkbox" name="take_away" value="1" defaultChecked={item.take_away} />
          Take-away
        </label>
      </div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <input type="checkbox" name="is_visible" value="1" defaultChecked={item.is_visible} />
          Visível no menu
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <input type="checkbox" name="is_featured" value="1" defaultChecked={item.is_featured} />
          Destaque
        </label>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        Ingredientes (texto expansível no menu)
        <textarea name="menu_ingredients" rows={2} placeholder="Lista de ingredientes, uma por linha" defaultValue={item.menu_ingredients ?? ""} />
      </label>
      <button type="submit">Guardar</button>
      {state?.error && <span style={{ color: "crimson" }}>{state.error}</span>}
    </form>
  );
}
