/**
 * Formata um valor numérico como preço no estilo pt-PT (espaço milhares, vírgula decimal).
 * Determinístico: mesmo resultado em servidor e cliente, evitando erros de hidratação (#418/#423).
 * Normaliza o valor a 2 decimais e trata currencyCode como string estável.
 */
export function formatPrice(value: number, currencyCode?: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0,00";
  const rounded = Math.round(Math.abs(n) * 100) / 100;
  const intPart = Math.floor(rounded);
  const decPart = Math.round((rounded - intPart) * 100);
  const paddedDec = String(decPart).padStart(2, "0");
  const withThousands = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const formatted = `${withThousands},${paddedDec}`;
  const code = String(currencyCode ?? "€").trim();
  return code === "" || code === "€" || code === "EUR" ? `${formatted} €` : `${formatted} ${code}`;
}
