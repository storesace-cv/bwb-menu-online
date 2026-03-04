"use client";

import { useFormState } from "react-dom";
import { createStore } from "../../../actions";

export function CreateStoreForm({ tenantId }: { tenantId: string }) {
  const [state, formAction] = useFormState(createStore, null);

  return (
    <form action={formAction} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
      <input type="hidden" name="tenant_id" value={tenantId} />
      <label>
        Nº loja <input name="store_number" type="number" required min={1} />
      </label>
      <label>
        Nome <input name="name" type="text" placeholder="Nome da loja" />
      </label>
      <label>
        Source <input name="source_type" type="text" defaultValue="netbo" />
      </label>
      <button type="submit">Criar</button>
      {state?.error && <span style={{ color: "crimson" }}>{state.error}</span>}
    </form>
  );
}
