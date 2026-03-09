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

  const parts: string[] = [];
  const addr = footer?.address?.trim();
  const em = footer?.email?.trim();
  const ph = footer?.phone?.trim();
  if (addr) parts.push(addr);
  if (em) parts.push(em);
  if (ph) parts.push(ph);
  const line2 = parts.join(" | ");

  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 pt-6" aria-label="Rodapé">
      <div
        className="rounded-2xl p-4 text-sm text-gray-800"
        style={style}
      >
        {footer?.logo_url?.trim() ? (
          <div className="mb-3">
            <img
              src={footer.logo_url}
              alt=""
              className="max-h-[32px] w-auto object-contain"
            />
          </div>
        ) : null}
        {line2 ? (
          <p className="mb-2 break-words">{line2}</p>
        ) : null}
        <p className="m-0 text-gray-700">
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
