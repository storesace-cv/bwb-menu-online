"use client";

const DEFAULT_FOOTER_BG = "#F2F2F2";
const MAILTO = "mailto:suporte@bwb.pt?subject=Menu%20Digital%20-%20Pedido%20de%20contacto";

export type MenuFooterProps = {
  logo_url?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  background_color?: string | null;
};

export function MenuFooterSection({ footer }: { footer?: MenuFooterProps | null }) {
  const rawBg = footer?.background_color?.trim();
  const bg = rawBg && (/^#[0-9A-Fa-f]{6}$/.test(rawBg) || rawBg.startsWith("rgb")) ? rawBg : DEFAULT_FOOTER_BG;
  const style = { backgroundColor: bg };

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
        className="rounded-2xl py-2 px-3 text-sm text-gray-800 text-center space-y-0 leading-tight"
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
        <p className="m-0 text-gray-700 text-xs">
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
