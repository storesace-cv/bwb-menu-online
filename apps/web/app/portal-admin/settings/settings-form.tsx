"use client";

import { useFormState } from "react-dom";
import { updateStoreSettings } from "../actions";

export function SettingsForm({
  storeId,
  initial,
}: {
  storeId: string;
  initial: { store_display_name?: string; primary_color?: string; logo_url?: string; currency_code?: string };
}) {
  const [state, formAction] = useFormState(updateStoreSettings, null);
  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "28rem" }}>
      <input type="hidden" name="store_id" value={storeId} />
      <label>
        Nome na loja (menu público)
        <input name="store_display_name" type="text" defaultValue={initial.store_display_name ?? ""} placeholder="ex: Café Central" />
      </label>
      <label>
        Cor primária
        <input name="primary_color" type="text" defaultValue={initial.primary_color ?? ""} placeholder="ex: #1976d2" />
      </label>
      <label>
        URL do logótipo
        <input name="logo_url" type="url" defaultValue={initial.logo_url ?? ""} placeholder="https://..." />
      </label>
      <label>
        Código de moeda
        <input name="currency_code" type="text" defaultValue={initial.currency_code ?? ""} placeholder="ex: EUR, Kz" />
      </label>
      <button type="submit">Guardar</button>
      {state?.error && <span style={{ color: "crimson" }}>{state.error}</span>}
    </form>
  );
}
