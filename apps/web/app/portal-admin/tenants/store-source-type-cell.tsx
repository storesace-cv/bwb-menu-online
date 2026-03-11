"use client";

import { getSourceTypeLabel } from "./source-type-options";

/** Origem dos Dados é definida ao nível do tenant e não é editável por loja. Apenas leitura. */
export function StoreSourceTypeCell({ sourceType }: { storeId: string; sourceType: string }) {
  return (
    <span className="text-slate-200 text-sm">
      {getSourceTypeLabel(sourceType || "")}
    </span>
  );
}
