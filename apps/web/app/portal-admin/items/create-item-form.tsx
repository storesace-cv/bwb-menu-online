"use client";

import { useFormState } from "react-dom";
import { createMenuItem } from "../actions";

type ArticleType = { id: string; name: string; icon_code: string };

export function CreateItemForm({ storeId, articleTypes }: { storeId: string; articleTypes: ArticleType[] }) {
  const [state, formAction] = useFormState(createMenuItem, null);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "32rem" }}>
      <input type="hidden" name="store_id" value={storeId} />
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <label>
          Nome * <input name="menu_name" type="text" required placeholder="ex: Bifana" />
        </label>
        <label>
          Descrição <input name="menu_description" type="text" placeholder="Breve descrição" />
        </label>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <label>
          Preço <input name="menu_price" type="number" step="0.01" min={0} placeholder="0.00" />
        </label>
        <label>
          Tipo de artigo{" "}
          <select name="article_type_id">
            <option value="">Nenhum</option>
            {articleTypes.map((at) => (
              <option key={at.id} value={at.id}>{at.name}</option>
            ))}
          </select>
        </label>
        <label>
          Ordem <input name="sort_order" type="number" defaultValue={0} style={{ width: "4rem" }} />
        </label>
      </div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <input type="checkbox" name="is_promotion" value="1" />
          Em promoção
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          Preço antigo <input name="price_old" type="number" step="0.01" min={0} placeholder="0.00" style={{ width: "5rem" }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <input type="checkbox" name="take_away" value="1" />
          Take-away
        </label>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        Ingredientes (texto expansível no menu)
        <textarea name="menu_ingredients" rows={2} placeholder="Lista de ingredientes, uma por linha" />
      </label>
      <button type="submit">Criar item</button>
      {state?.error && <span style={{ color: "crimson" }}>{state.error}</span>}
    </form>
  );
}
