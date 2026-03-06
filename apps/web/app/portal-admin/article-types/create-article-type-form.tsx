"use client";

import { useFormState } from "react-dom";
import { createArticleType } from "../actions";
import { MENU_ICON_CODES, MenuIcon } from "@/components/menu-icons";

export function CreateArticleTypeForm({ storeId }: { storeId: string }) {
  const [state, formAction] = useFormState(createArticleType, null);

  return (
    <form action={formAction} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
      <input type="hidden" name="store_id" value={storeId} />
      <label>
        Nome <input name="name" type="text" required placeholder="ex: Carne" />
      </label>
      <label>
        Ícone{" "}
        <select name="icon_code" style={{ minWidth: "7rem" }}>
          {MENU_ICON_CODES.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
      </label>
      <label>
        Ordem <input name="sort_order" type="number" defaultValue={0} />
      </label>
      <button type="submit">Criar tipo</button>
      {state?.error && <span style={{ color: "crimson" }}>{state.error}</span>}
    </form>
  );
}

export function ArticleTypeIconPicker({ name, defaultValue }: { name: string; defaultValue?: string }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
      {MENU_ICON_CODES.map((code) => (
        <label key={code} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
          <input type="radio" name={name} value={code} defaultChecked={code === (defaultValue ?? "fish")} />
          <span style={{ marginLeft: "0.25rem" }}><MenuIcon code={code} size={20} /></span>
        </label>
      ))}
    </div>
  );
}
