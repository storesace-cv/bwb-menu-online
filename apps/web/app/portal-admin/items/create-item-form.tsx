"use client";

import { useFormState } from "react-dom";
import { createMenuItem } from "../actions";

export function CreateItemForm({ storeId }: { storeId: string }) {
  const [state, formAction] = useFormState(createMenuItem, null);

  return (
    <form action={formAction} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
      <input type="hidden" name="store_id" value={storeId} />
      <label>
        Nome <input name="menu_name" type="text" required placeholder="ex: Bifana" />
      </label>
      <label>
        Preço <input name="menu_price" type="number" step="0.01" min={0} placeholder="0.00" />
      </label>
      <label>
        Ordem <input name="sort_order" type="number" defaultValue={0} />
      </label>
      <button type="submit">Criar item</button>
      {state?.error && <span style={{ color: "crimson" }}>{state.error}</span>}
    </form>
  );
}
