"use client";

import { useFormState } from "react-dom";
import { createSection } from "../actions";

export function CreateSectionForm({ storeId }: { storeId: string }) {
  const [state, formAction] = useFormState(createSection, null);

  return (
    <form action={formAction} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
      <input type="hidden" name="store_id" value={storeId} />
      <label>
        Nome <input name="name" type="text" required placeholder="ex: Snack-Bar" />
      </label>
      <label>
        Ordem <input name="sort_order" type="number" defaultValue={0} />
      </label>
      <button type="submit">Criar secção</button>
      {state?.error && <span style={{ color: "crimson" }}>{state.error}</span>}
    </form>
  );
}
