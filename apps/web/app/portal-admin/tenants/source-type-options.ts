/** Options for "Origem dos Dados" (stores.source_type). Used in create form and edit cell. */

export const SOURCE_TYPE_OPTIONS: { value: string; label: string; disabled: boolean }[] = [
  { value: "manual", label: "Manual (a implementar)", disabled: true },
  { value: "excel_zsbms", label: "Excel - ZSbms", disabled: false },
  { value: "excel_netbo", label: "Excel - NET-bo", disabled: false },
  { value: "excel_storesace", label: "Excel - Storesace (a implementar)", disabled: true },
  { value: "netbo_api", label: "Net-bo API", disabled: false },
  { value: "storesace_api", label: "Storesace API (a implementar)", disabled: true },
  { value: "demo", label: "Demo", disabled: false },
];

/** Legacy values that may exist in DB. */
const LEGACY_LABELS: Record<string, string> = {
  netbo: "Net-bo (legado)",
  storesace: "Storesace (legado)",
};

export function getSourceTypeLabel(value: string): string {
  const opt = SOURCE_TYPE_OPTIONS.find((o) => o.value === value);
  if (opt) return opt.label;
  return LEGACY_LABELS[value] ?? value;
}

/** All options for editing source_type (every allowed DB value; no disabled). */
export const SOURCE_TYPE_EDIT_OPTIONS: { value: string; label: string }[] = [
  { value: "netbo_api", label: "Net-bo API" },
  { value: "demo", label: "Demo" },
  { value: "netbo", label: LEGACY_LABELS.netbo },
  { value: "storesace", label: LEGACY_LABELS.storesace },
  { value: "manual", label: "Manual (a implementar)" },
  { value: "excel_zsbms", label: "Excel - ZSbms" },
  { value: "excel_netbo", label: "Excel - NET-bo" },
  { value: "excel_storesace", label: "Excel - Storesace (a implementar)" },
  { value: "storesace_api", label: "Storesace API (a implementar)" },
];
