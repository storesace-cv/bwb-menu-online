"use client";

import { useFormState } from "react-dom";
import { createCategory } from "../actions";

type Section = { id: string; name: string; sort_order: number };

export function CreateCategoryForm({ storeId, sections }: { storeId: string; sections: Section[] }) {
  const [state, formAction] = useFormState(createCategory, null);

  return (
    <form action={formAction} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
      <input type="hidden" name="store_id" value={storeId} />
      <label>
        Nome <input name="name" type="text" required placeholder="ex: Entradas" />
      </label>
      <label>
        Secção{" "}
        <select name="section_id">
          <option value="">Nenhuma</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>
      <label>
        Ordem <input name="sort_order" type="number" defaultValue={0} />
      </label>
      <button type="submit">Criar categoria</button>
      {state?.error && <span style={{ color: "crimson" }}>{state.error}</span>}
    </form>
  );
}
