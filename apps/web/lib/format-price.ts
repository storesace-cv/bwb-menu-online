/**
 * Formata um valor numérico como preço no estilo pt-PT (espaço milhares, vírgula decimal).
 * Determinístico: mesmo resultado em servidor e cliente, evitando erros de hidratação (#418/#423).
 */
export function formatPrice(value: number, currencyCode?: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0,00";
  const abs = Math.abs(n);
  const intPart = Math.floor(abs);
  const decPart = Math.round((abs - intPart) * 100);
  const paddedDec = String(decPart).padStart(2, "0");
  const withThousands = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const formatted = `${withThousands},${paddedDec}`;
  const code = (currencyCode || "€").trim();
  return code === "€" || code === "EUR" ? `${formatted} €` : `${formatted} ${code}`;
}
