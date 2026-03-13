"use client";

import { useFormState } from "react-dom";
import { updateStoreSettings } from "../actions";
import { useFormSubmitLoading } from "@/lib/use-form-submit-loading";
import { Input, Alert, Select, ColorPickerField, Card, Button, SubmitButton } from "@/components/admin";
import { DEFAULT_MENU_TEMPLATE_KEY } from "@/lib/menu-templates";

const FORM_ID = "settings-app-form";
const DEFAULT_FOOTER_BG = "#F2F2F2";
const GRID_SECTION = "grid grid-cols-1 md:grid-cols-2 gap-4";

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
      <label htmlFor="logo_file" className="text-sm font-medium text-slate-300">
        Logótipo (menu público)
      </label>
      <input
        id="logo_file"
        name="logo_file"
        type="file"
        accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
        className="block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-gray-800"
      />
      <p className="text-xs text-slate-500">
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

const linkWebgradients = (
  <a
    href="https://webgradients.com"
    target="_blank"
    rel="noopener noreferrer"
    className="text-slate-400 hover:text-slate-300 underline"
  >
    webgradients.com
  </a>
);

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
    logo_fill_color?: string;
    logo_stroke_color?: string;
    currency_code?: string;
    menu_template_key?: string;
    hero_text?: string;
    hero_background_color?: string;
    hero_background_css?: string;
    footer_logo_url?: string;
    footer_logo_fill_color?: string;
    footer_logo_stroke_color?: string;
    footer_address?: string;
    footer_email?: string;
    footer_phone?: string;
    footer_background_color?: string;
    footer_background_css?: string;
    footer_text_color?: string;
    contact_url?: string;
    privacy_url?: string;
    reservation_url?: string;
    featured_section_label?: string;
    featured_template_key?: string;
    featured_carousel_background_color?: string;
    featured_carousel_background_css?: string;
    featured_dots_background_color?: string;
    featured_dots_background_css?: string;
  };
}) {
  const [state, formAction] = useFormState(updateStoreSettings, null);
  const [submitting, formBind] = useFormSubmitLoading(state);
  return (
    <form
      id={FORM_ID}
      action={formAction}
      className="flex flex-col gap-6"
      encType="multipart/form-data"
      {...formBind}
    >
      <input type="hidden" name="store_id" value={storeId} />

      <h2 className="text-2xl font-semibold text-slate-200 mb-2">Cabeçalho</h2>
      <p className="text-sm text-slate-400 mb-4">Topo e identidade do menu público.</p>
      <Card className="border-white">
        <div className={GRID_SECTION}>
          <Input
            id="store_display_name"
            name="store_display_name"
            label="Nome na loja (menu público)"
            type="text"
            defaultValue={initial.store_display_name ?? ""}
            placeholder="ex: Café Central"
          />
          <ColorPickerField
            id="primary_color"
            name="primary_color"
            label="Cor primária"
            defaultValue={initial.primary_color ?? ""}
            defaultHex="#1976d2"
            placeholder="#1976d2"
          />
          <div className="md:col-span-2">
            <LogoUploadBlock logoUrl={initial.logo_url} formId={FORM_ID} />
          </div>
          <Input
            id="logo_url"
            name="logo_url"
            label="URL do logótipo"
            type="url"
            defaultValue={initial.logo_url ?? ""}
            placeholder="https://..."
          />
          <div className="space-y-4">
            <ColorPickerField
              id="logo_fill_color"
              name="logo_fill_color"
              label="Cor do fill do logótipo (SVG)"
              defaultValue={initial.logo_fill_color ?? ""}
              defaultHex="#000000"
              placeholder="#000000"
              allowEmpty
            />
            <ColorPickerField
              id="logo_stroke_color"
              name="logo_stroke_color"
              label="Cor do stroke do logótipo (SVG)"
              defaultValue={initial.logo_stroke_color ?? ""}
              defaultHex="#000000"
              placeholder="#000000"
              allowEmpty
            />
          </div>
          <p className="md:col-span-2 text-xs text-slate-500 -mt-2">
            Apenas para logotipos em SVG; deixe vazio para manter as cores do ficheiro.
          </p>
        </div>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton variant="primary" submitting={submitting} loadingText="A guardar…">
          Guardar
        </SubmitButton>
        <span className="text-xs text-slate-500">Grava todos os parâmetros do formulário (todas as secções).</span>
      </div>

      <h2 className="text-2xl font-semibold text-slate-200 mb-2">Galeria</h2>
      <p className="text-sm text-slate-400 mb-4">
        Ordem como no menu público (de cima para baixo): texto da faixa introdutória e fundo; nome e modelo do bloco de destaques e fundos do carrossel e dos indicadores.
      </p>
      <Card className="border-white">
        <div className={GRID_SECTION}>
          {/* Bloco hero (faixa logo + texto): conteúdo, depois fundo */}
          <div className="md:col-span-2">
            <Input
              id="hero_text"
              name="hero_text"
              label="Texto hero (menu público)"
              type="text"
              defaultValue={initial.hero_text ?? ""}
              placeholder="Texto introdutório opcional"
            />
          </div>
          <ColorPickerField
            id="hero_background_color"
            name="hero_background_color"
            label="Cor de fundo da faixa introdutória (hero)"
            defaultValue={initial.hero_background_color ?? ""}
            defaultHex="#F2F2F2"
            placeholder="#F2F2F2"
            allowEmpty
          />
          <div className="md:col-span-2 flex flex-col gap-2">
            <label htmlFor="hero_background_css" className="text-sm font-medium text-slate-300">
              CSS de fundo da faixa introdutória (opcional)
            </label>
            <textarea
              id="hero_background_css"
              name="hero_background_css"
              rows={3}
              defaultValue={initial.hero_background_css ?? ""}
              placeholder="ex: linear-gradient(90deg, rgba(42,123,155,1) 0%, rgba(87,199,133,1) 50%, rgba(237,221,83,1) 100%)"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 font-mono"
            />
            <p className="text-xs text-slate-500">Se preenchido, substitui a cor sólida acima.</p>
          </div>

          {/* Bloco destaques: nome e modelo, depois fundo do carrossel (secção inclui título+cards) */}
          <div className="md:col-span-2">
            <Input
              id="featured_section_label"
              name="featured_section_label"
              label="Nome que aparece no Menu (bloco de destaques)"
              type="text"
              defaultValue={initial.featured_section_label ?? ""}
              placeholder="ex: Escolhas do Chef, Destaques"
            />
          </div>
          <div className="md:col-span-2">
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
          </div>
          <ColorPickerField
            id="featured_carousel_background_color"
            name="featured_carousel_background_color"
            label="Cor de fundo do bloco do carrossel de destaques"
            defaultValue={initial.featured_carousel_background_color ?? ""}
            defaultHex="#F2F2F2"
            placeholder="#F2F2F2"
            allowEmpty
          />
          <div className="md:col-span-2 flex flex-col gap-2">
            <label htmlFor="featured_carousel_background_css" className="text-sm font-medium text-slate-300">
              CSS de fundo do carrossel de destaques (opcional)
            </label>
            <textarea
              id="featured_carousel_background_css"
              name="featured_carousel_background_css"
              rows={3}
              defaultValue={initial.featured_carousel_background_css ?? ""}
              placeholder="ex: linear-gradient(90deg, rgba(42,123,155,1) 0%, rgba(87,199,133,1) 50%, rgba(237,221,83,1) 100%)"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 font-mono"
            />
            <p className="text-xs text-slate-500">Se preenchido, substitui a cor sólida acima.</p>
          </div>

          {/* Indicadores (bolinhas): fundo por último */}
          <ColorPickerField
            id="featured_dots_background_color"
            name="featured_dots_background_color"
            label="Cor de fundo dos indicadores (bolinhas) do carrossel"
            defaultValue={initial.featured_dots_background_color ?? ""}
            defaultHex="#F2F2F2"
            placeholder="#F2F2F2"
            allowEmpty
          />
          <div className="md:col-span-2 flex flex-col gap-2">
            <label htmlFor="featured_dots_background_css" className="text-sm font-medium text-slate-300">
              CSS de fundo dos indicadores (opcional)
            </label>
            <textarea
              id="featured_dots_background_css"
              name="featured_dots_background_css"
              rows={3}
              defaultValue={initial.featured_dots_background_css ?? ""}
              placeholder="ex: linear-gradient(90deg, rgba(42,123,155,1) 0%, rgba(87,199,133,1) 100%)"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 font-mono"
            />
            <p className="text-xs text-slate-500">Se preenchido, substitui a cor sólida acima.</p>
            <p className="text-xs text-slate-500">Mais gradientes (copiar CSS): {linkWebgradients}</p>
          </div>
        </div>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton variant="primary" submitting={submitting} loadingText="A guardar…">
          Guardar
        </SubmitButton>
      </div>

      <h2 className="text-2xl font-semibold text-slate-200 mb-2">Artigos e menu</h2>
      <p className="text-sm text-slate-400 mb-4">Template global e moeda.</p>
      <Card className="border-white">
        <div className={GRID_SECTION}>
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
            id="currency_code"
            name="currency_code"
            label="Código de moeda"
            type="text"
            defaultValue={initial.currency_code ?? ""}
            placeholder="ex: EUR, Kz"
          />
        </div>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton variant="primary" submitting={submitting} loadingText="A guardar…">
          Guardar
        </SubmitButton>
      </div>

      <h2 className="text-2xl font-semibold text-slate-200 mb-2">Rodapé</h2>
      <p className="text-sm text-slate-400 mb-4">Rodapé do menu público.</p>
      <Card className="border-white">
        <input
          type="hidden"
          name="footer_logo_url"
          id="footer_logo_url"
          defaultValue={initial.footer_logo_url ?? ""}
        />
        <div className={GRID_SECTION}>
          <div className="md:col-span-2">
            <FooterLogoUploadBlock logoUrl={initial.footer_logo_url} formId={FORM_ID} />
          </div>
          <ColorPickerField
            id="footer_logo_fill_color"
            name="footer_logo_fill_color"
            label="Cor do fill do logo do rodapé (SVG)"
            defaultValue={initial.footer_logo_fill_color ?? ""}
            defaultHex="#000000"
            placeholder="#000000"
            allowEmpty
          />
          <ColorPickerField
            id="footer_logo_stroke_color"
            name="footer_logo_stroke_color"
            label="Cor do stroke do logo do rodapé (SVG)"
            defaultValue={initial.footer_logo_stroke_color ?? ""}
            defaultHex="#000000"
            placeholder="#000000"
            allowEmpty
          />
          <p className="md:col-span-2 text-xs text-slate-500 -mt-2">
            Apenas para logotipos em SVG; deixe vazio para manter as cores do ficheiro.
          </p>
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
          <ColorPickerField
            id="footer_background_color"
            name="footer_background_color"
            label="Cor de fundo do rodapé"
            defaultValue={initial.footer_background_color ?? ""}
            defaultHex={DEFAULT_FOOTER_BG}
            placeholder="#F2F2F2"
          />
          <ColorPickerField
            id="footer_text_color"
            name="footer_text_color"
            label="Cor do texto do rodapé (opcional)"
            defaultValue={initial.footer_text_color ?? ""}
            defaultHex="#FFFFFF"
            placeholder="#FFFFFF"
            allowEmpty
          />
          <div className="md:col-span-2 flex flex-col gap-2">
            <label htmlFor="footer_background_css" className="text-sm font-medium text-slate-300">
              CSS de fundo (opcional)
            </label>
            <textarea
              id="footer_background_css"
              name="footer_background_css"
              rows={3}
              defaultValue={initial.footer_background_css ?? ""}
              placeholder="ex: linear-gradient(90deg, rgba(42,123,155,1) 0%, rgba(87,199,133,1) 50%, rgba(237,221,83,1) 100%)"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 font-mono"
            />
            <p className="text-xs text-slate-500">Se preenchido, substitui a cor sólida acima.</p>
            <p className="text-xs text-slate-500">Mais gradientes (copiar CSS): {linkWebgradients}</p>
          </div>
        </div>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton variant="primary" submitting={submitting} loadingText="A guardar…">
          Guardar
        </SubmitButton>
      </div>

      <h2 className="text-2xl font-semibold text-slate-200 mb-2">Ligações externas</h2>
      <p className="text-sm text-slate-400 mb-4">URLs exibidas no menu (contacto, privacidade, reserva).</p>
      <Card className="border-white">
        <div className={GRID_SECTION}>
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
        </div>
      </Card>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton variant="primary" submitting={submitting} loadingText="A guardar…">
            Guardar
          </SubmitButton>
        </div>
        {state?.error && <Alert variant="error">{state.error}</Alert>}
      </div>
    </form>
  );
}
