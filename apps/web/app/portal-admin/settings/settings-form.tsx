"use client";

import { useFormState } from "react-dom";
import { updateStoreSettings } from "../actions";
import { Input, Button, Alert, Select } from "@/components/admin";
import { DEFAULT_MENU_TEMPLATE_KEY } from "@/lib/menu-templates";

const MENU_TEMPLATE_OPTIONS: { value: string; label: string }[] = [
  { value: "bwb-branco", label: "BWB - Branco" },
];

export function SettingsForm({
  storeId,
  featuredTemplates,
  initial,
}: {
  storeId: string;
  featuredTemplates: { id: string; name: string; component_key: string }[];
  initial: {
    store_display_name?: string;
    primary_color?: string;
    logo_url?: string;
    currency_code?: string;
    menu_template_key?: string;
    hero_text?: string;
    footer_text?: string;
    contact_url?: string;
    privacy_url?: string;
    reservation_url?: string;
    featured_section_label?: string;
    featured_template_key?: string;
  };
}) {
  const [state, formAction] = useFormState(updateStoreSettings, null);
  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <input type="hidden" name="store_id" value={storeId} />
      <Select
        id="menu_template_key"
        name="menu_template_key"
        label="Template do Menu"
        defaultValue={initial.menu_template_key ?? DEFAULT_MENU_TEMPLATE_KEY}
      >
        {MENU_TEMPLATE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
      <Input
        id="featured_section_label"
        name="featured_section_label"
        label="Nome que aparece no Menu (bloco de destaques)"
        type="text"
        defaultValue={initial.featured_section_label ?? ""}
        placeholder="ex: Escolhas do Chef, Destaques"
      />
      <Select
        id="featured_template_key"
        name="featured_template_key"
        label="Modelo de apresentação de Destaques"
        defaultValue={initial.featured_template_key ?? "modelo-destaque-1"}
      >
        {featuredTemplates.map((t) => (
          <option key={t.id} value={t.component_key}>
            {t.name}
          </option>
        ))}
        {featuredTemplates.length === 0 && (
          <option value="modelo-destaque-1">Modelo Destaque 1</option>
        )}
      </Select>
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
      <Input
        id="hero_text"
        name="hero_text"
        label="Texto hero (menu público)"
        type="text"
        defaultValue={initial.hero_text ?? ""}
        placeholder="Texto introdutório opcional"
      />
      <Input
        id="footer_text"
        name="footer_text"
        label="Texto do rodapé"
        type="text"
        defaultValue={initial.footer_text ?? ""}
        placeholder="ex: Morada, contacto"
      />
      <Input
        id="contact_url"
        name="contact_url"
        label="URL Contacte-nos"
        type="url"
        defaultValue={initial.contact_url ?? ""}
        placeholder="https://..."
      />
      <Input
        id="privacy_url"
        name="privacy_url"
        label="URL Política de Privacidade"
        type="url"
        defaultValue={initial.privacy_url ?? ""}
        placeholder="https://..."
      />
      <Input
        id="reservation_url"
        name="reservation_url"
        label="URL Reservar mesa (abre em nova janela)"
        type="url"
        defaultValue={initial.reservation_url ?? ""}
        placeholder="https://..."
      />
      <Button type="submit" variant="primary">Guardar</Button>
      {state?.error && <Alert variant="error">{state.error}</Alert>}
    </form>
  );
}
