"use client";

import { useFormState } from "react-dom";
import { setStoreDomain } from "../../../../../actions";

export function SetDomainForm({ storeId }: { storeId: string }) {
  const [state, formAction] = useFormState(setStoreDomain, null);

  return (
    <form action={formAction} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
      <input type="hidden" name="store_id" value={storeId} />
      <label>
        Hostname <input name="hostname" type="text" required placeholder="ex: 9999999991.menu.bwb.pt" />
      </label>
      <label>
        Tipo <input name="domain_type" type="text" defaultValue="default" />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <input name="is_primary" type="checkbox" value="1" defaultChecked />
        Primário
      </label>
      <button type="submit">Guardar</button>
      {state?.error && <span style={{ color: "crimson" }}>{state.error}</span>}
    </form>
  );
}
