"use client";

import { useFormState } from "react-dom";
import { updateStoreSettings } from "../actions";
import { Input, Button, Alert } from "@/components/admin";

export function SettingsForm({
  storeId,
  initial,
}: {
  storeId: string;
  initial: { store_display_name?: string; primary_color?: string; logo_url?: string; currency_code?: string };
}) {
  const [state, formAction] = useFormState(updateStoreSettings, null);
  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <input type="hidden" name="store_id" value={storeId} />
      <Input
        id="store_display_name"
        name="store_display_name"
        label="Nome na loja (menu público)"
        type="text"
        defaultValue={initial.store_display_name ?? ""}
        placeholder="ex: Café Central"
      />
      <Input
        id="primary_color"
        name="primary_color"
        label="Cor primária"
        type="text"
        defaultValue={initial.primary_color ?? ""}
        placeholder="ex: #1976d2"
      />
      <Input
        id="logo_url"
        name="logo_url"
        label="URL do logótipo"
        type="url"
        defaultValue={initial.logo_url ?? ""}
        placeholder="https://..."
      />
      <Input
        id="currency_code"
        name="currency_code"
        label="Código de moeda"
        type="text"
        defaultValue={initial.currency_code ?? ""}
        placeholder="ex: EUR, Kz"
      />
      <Button type="submit" variant="primary">Guardar</Button>
      {state?.error && <Alert variant="error">{state.error}</Alert>}
    </form>
  );
}
