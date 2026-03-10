"use client";

import { buildBackgroundStyle } from "@/lib/parse-css-declarations";

const DEFAULT_FOOTER_BG = "#F2F2F2";
const MAILTO = "mailto:suporte@bwb.pt?subject=Menu%20Digital%20-%20Pedido%20de%20contacto";

export type MenuFooterProps = {
  logo_url?: string | null;
  /** Cor do fill do logo do rodapé (SVG). Aplicada quando o logo é SVG. */
  logo_fill_color?: string | null;
  /** Cor do stroke do logo do rodapé (SVG). Aplicada quando o logo é SVG. */
  logo_stroke_color?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  background_color?: string | null;
  background_css?: string | null;
  text_color?: string | null;
};

export function MenuFooterSection({ footer }: { footer?: MenuFooterProps | null }) {
  const style: Record<string, string> = buildBackgroundStyle(
    footer?.background_color,
    footer?.background_css,
    { backgroundColor: DEFAULT_FOOTER_BG }
  );
  if (footer?.text_color?.trim()) {
    style.color = footer.text_color.trim();
  }

  const addr = footer?.address?.trim();
  const em = footer?.email?.trim();
  const ph = footer?.phone?.trim();
  const contactParts: string[] = [];
  if (em) contactParts.push(em);
  if (ph) contactParts.push(ph);
  const lineContact = contactParts.length > 0 ? contactParts.join(" | ") : "";

  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 pt-6" aria-label="Rodapé">
      <div
        className={`rounded-2xl py-2 px-3 text-sm text-center space-y-0 leading-tight ${footer?.text_color?.trim() ? "" : "text-gray-800"}`}
        style={style}
      >
        {footer?.logo_url?.trim() ? (
          <p className="m-0">
            <img
              src={
                (footer.logo_fill_color || footer.logo_stroke_color) && footer.logo_url.toLowerCase().includes(".svg")
                  ? `/api/public-menu/logo?url=${encodeURIComponent(footer.logo_url)}${footer.logo_fill_color ? `&fill=${encodeURIComponent(footer.logo_fill_color)}` : ""}${footer.logo_stroke_color ? `&stroke=${encodeURIComponent(footer.logo_stroke_color)}` : ""}`
                  : footer.logo_url
              }
              alt=""
              className="max-h-[32px] w-auto object-contain inline-block"
            />
          </p>
        ) : null}
        {addr ? <p className="m-0 whitespace-nowrap overflow-x-auto">{addr}</p> : null}
        {lineContact ? <p className="m-0">{lineContact}</p> : null}
        <p className={`m-0 text-xs ${footer?.text_color?.trim() ? "text-inherit" : "text-gray-700"}`}>
          © {year}{" "}
          <a
            href={MAILTO}
            className="text-inherit no-underline cursor-pointer"
          >
            Business with Brains
          </a>
          . Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
