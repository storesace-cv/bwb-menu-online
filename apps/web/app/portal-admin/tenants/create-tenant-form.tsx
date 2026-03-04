"use client";

import { useFormState } from "react-dom";
import { createTenant } from "../actions";

export function CreateTenantForm() {
  const [state, formAction] = useFormState(createTenant, null);

  return (
    <form action={formAction} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
      <label>
        NIF <input name="nif" type="text" required placeholder="123456789" />
      </label>
      <label>
        Nome <input name="name" type="text" placeholder="Nome do tenant" />
      </label>
      <button type="submit">Criar</button>
      {state?.error && <span style={{ color: "crimson" }}>{state.error}</span>}
    </form>
  );
}
