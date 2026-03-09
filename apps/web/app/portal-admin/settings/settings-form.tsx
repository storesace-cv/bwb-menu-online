"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { updateStoreSettings } from "../actions";
import { Input, Button, Alert, Select } from "@/components/admin";
import { DEFAULT_MENU_TEMPLATE_KEY } from "@/lib/menu-templates";

const FORM_ID = "settings-app-form";
const DEFAULT_FOOTER_BG = "#F2F2F2";

const MENU_TEMPLATE_OPTIONS: { value: string; label: string }[] = [
  { value: "bwb-branco", label: "BWB - Branco" },
];

function LogoUploadBlock({ logoUrl, formId }: { logoUrl?: string; formId: string }) {
  const handleRemove = () => {
    const input = document.getElementById("logo_url");
    if (input && input instanceof HTMLInputElement) input.value = "";
    (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit();
  };
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="logo_file" className="text-sm font-medium text-gray-700">
        Logótipo (menu público)
      </label>
      <input
        id="logo_file"
        name="logo_file"
        type="file"
        accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
        className="block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-gray-800"
      />
      <p className="text-xs text-gray-500">
        Formatos: SVG (preferido), PNG, JPG ou WebP. Imagens raster: máx. 50×1322 px. SVG: máx. 1 MB.
      </p>
      {logoUrl ? (
        <div className="flex items-center gap-3 flex-wrap">
          <img src={logoUrl} alt="Logo atual" className="max-h-[50px] w-auto object-contain" />
          <Button type="button" variant="secondary" onClick={handleRemove}>
            Remover logótipo
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FooterLogoUploadBlock({ logoUrl, formId }: { logoUrl?: string; formId: string }) {
  const handleRemove = () => {
    const input = document.getElementById("footer_logo_url");
    if (input && input instanceof HTMLInputElement) input.value = "";
    (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit();
  };
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="footer_logo_file" className="text-sm font-medium text-slate-300">
        Logo da Empresa (rodapé)
      </label>
      <input
        id="footer_logo_file"
        name="footer_logo_file"
        type="file"
        accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
        className="block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-gray-800"
      />
      <p className="text-xs text-slate-500">
        SVG, PNG, JPG ou WebP. Pequeno (altura máx. 36 px). Ficheiro máx. 2 MB.
      </p>
      {logoUrl ? (
        <div className="flex items-center gap-3 flex-wrap">
          <img src={logoUrl} alt="Logo rodapé" className="max-h-[32px] w-auto object-contain" />
          <Button type="button" variant="secondary" onClick={handleRemove}>
            Remover logo do rodapé
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FooterBackgroundColorPicker({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(() => {
    const v = (defaultValue ?? DEFAULT_FOOTER_BG).trim();
    return /^#[0-9A-Fa-f]{6}$/.test(v) ? v : DEFAULT_FOOTER_BG;
  });
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-300">
        Cor de fundo do rodapé
      </label>
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="hidden"
          name="footer_background_color"
          id="footer_background_color"
          value={value}
        />
        <input
          type="color"
          aria-label="Cor de fundo"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border border-slate-600 bg-slate-800"
        />
        <input
          type="text"
          aria-label="Cor em hex"
          value={value}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (v === "" || /^#[0-9A-Fa-f]{0,6}$/.test(v) || /^[0-9A-Fa-f]{0,6}$/.test(v)) {
              const hex = v.startsWith("#") ? v : v ? `#${v}` : DEFAULT_FOOTER_BG;
              setValue(hex.length >= 7 ? hex.slice(0, 7) : hex || DEFAULT_FOOTER_BG);
            }
          }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            const hex = v.startsWith("#") ? v : v ? `#${v}` : "";
            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) setValue(hex);
            else if (!v) setValue(DEFAULT_FOOTER_BG);
          }}
          className="w-full max-w-[8rem] rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white"
          placeholder="#F2F2F2"
        />
      </div>
    </div>
  );
}

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
    footer_logo_url?: string;
    footer_address?: string;
    footer_email?: string;
    footer_phone?: string;
    footer_background_color?: string;
    contact_url?: string;
    privacy_url?: string;
    reservation_url?: string;
    featured_section_label?: string;
    featured_template_key?: string;
  };
}) {
  const [state, formAction] = useFormState(updateStoreSettings, null);
  return (
    <form
      id={FORM_ID}
      action={formAction}
      className="flex flex-col gap-4 max-w-md"
      encType="multipart/form-data"
    >
      <input type="hidden" name="store_id" value={storeId} />
      <LogoUploadBlock logoUrl={initial.logo_url} formId={FORM_ID} />
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
      <div className="border-t border-slate-700 pt-4 mt-2">
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Rodapé</h2>
        <input
          type="hidden"
          name="footer_logo_url"
          id="footer_logo_url"
          defaultValue={initial.footer_logo_url ?? ""}
        />
        <div className="flex flex-col gap-4">
          <FooterLogoUploadBlock logoUrl={initial.footer_logo_url} formId={FORM_ID} />
          <Input
            id="footer_address"
            name="footer_address"
            label="Morada"
            type="text"
            defaultValue={initial.footer_address ?? ""}
            placeholder="ex: Rua Example, 123"
          />
          <Input
            id="footer_email"
            name="footer_email"
            label="Email"
            type="email"
            defaultValue={initial.footer_email ?? ""}
            placeholder="ex: contacto@exemplo.pt"
          />
          <Input
            id="footer_phone"
            name="footer_phone"
            label="Telefone"
            type="text"
            defaultValue={initial.footer_phone ?? ""}
            placeholder="ex: +351 123 456 789"
          />
          <FooterBackgroundColorPicker defaultValue={initial.footer_background_color} />
        </div>
      </div>
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
