"use client";

const DEFAULT_FOOTER_BG = "#F2F2F2";
const MAILTO = "mailto:suporte@bwb.pt?subject=Menu%20Digital%20-%20Pedido%20de%20contacto";

function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/gi, (_, c) => (c as string).toUpperCase());
}

function parseCssDeclarations(css: string): Record<string, string> {
  const style: Record<string, string> = {};
  const segments = css.split(";").map((s) => s.trim()).filter(Boolean);
  for (const segment of segments) {
    const colonIndex = segment.indexOf(":");
    if (colonIndex === -1) continue;
    const prop = segment.slice(0, colonIndex).trim();
    const value = segment.slice(colonIndex + 1).trim();
    if (!prop || value === undefined) continue;
    const camel = kebabToCamel(prop);
    style[camel] = value;
  }
  return style;
}

export type MenuFooterProps = {
  logo_url?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  background_color?: string | null;
  background_css?: string | null;
  text_color?: string | null;
};

export function MenuFooterSection({ footer }: { footer?: MenuFooterProps | null }) {
  const rawBgCss = footer?.background_css?.trim();
  const rawBg = footer?.background_color?.trim();
  const bg = rawBg && (/^#[0-9A-Fa-f]{6}$/.test(rawBg) || rawBg.startsWith("rgb")) ? rawBg : DEFAULT_FOOTER_BG;
  const style: Record<string, string> = rawBgCss
    ? (() => {
        const parsed = parseCssDeclarations(rawBgCss);
        if (Object.keys(parsed).length === 0) return { background: rawBgCss };
        return parsed;
      })()
    : { backgroundColor: bg };
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
              src={footer.logo_url}
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
