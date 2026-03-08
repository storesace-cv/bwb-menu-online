"use client";

const SEVERITY_CLASSES: Record<number, string> = {
  1: "bg-green-600/30 text-green-200 border-green-500/50",
  2: "bg-lime-600/30 text-lime-200 border-lime-500/50",
  3: "bg-orange-600/30 text-orange-200 border-orange-500/50",
  4: "bg-red-600/30 text-red-200 border-red-500/50",
  5: "bg-red-700/40 text-red-100 border-red-600/60",
};

export type AllergenOption = {
  id: string;
  code: string;
  name_i18n?: Record<string, string> | null;
  severity?: number | null;
};

function getLabel(a: AllergenOption): string {
  const i18n = a.name_i18n;
  if (i18n && typeof i18n === "object") {
    if (i18n.pt) return i18n.pt;
    if (i18n.en) return i18n.en;
  }
  return a.code;
}

export function AllergenChecklist({
  allergens,
  selectedIds,
  name = "allergen_ids",
}: {
  allergens: AllergenOption[];
  selectedIds: string[];
  name?: string;
}) {
  const selectedSet = new Set(selectedIds);
  return (
    <div className="w-full">
      <span className="block text-sm font-medium text-slate-300 mb-2">Alergénios</span>
      <div className="flex flex-wrap gap-3">
        {allergens.map((a) => {
          const severity = a.severity != null && a.severity >= 1 && a.severity <= 5 ? a.severity : 2;
          const badgeClass = SEVERITY_CLASSES[severity] ?? SEVERITY_CLASSES[2];
          return (
            <label
              key={a.id}
              className="flex items-center gap-2 cursor-pointer text-slate-200 text-sm"
            >
              <input
                type="checkbox"
                name={name}
                value={a.id}
                defaultChecked={selectedSet.has(a.id)}
                className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
              />
              <span className={`px-1.5 py-0.5 rounded text-xs border ${badgeClass}`}>
                {getLabel(a)}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
