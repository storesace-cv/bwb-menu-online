"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  LAYOUT_ZONE_TYPES,
  LAYOUT_ZONE_LABELS,
  getDefaultLayoutDefinition,
  DEFAULT_CANVAS_HEIGHT,
  type LayoutDefinition,
  type LayoutZoneType,
  type ZoneWidth,
} from "@/lib/presentation-templates";
import { updatePresentationTemplateLayout } from "@/app/portal-admin/actions";
import { Button, Input, Alert } from "@/components/admin";

/** Rótulos longos para a pré-visualização (alinhados ao diagrama Modelo Restaurante 1). */
const PREVIEW_ZONE_LABELS: Record<LayoutZoneType, string> = {
  image: "Imagem do artigo",
  icons: "Faixa de ícones",
  name: "Nome do artigo",
  description: "Descrição",
  ingredients: "Secção ingredientes",
  prep_time: "Tempo de preparação",
  allergens: "Alergénios",
  price_old: "Preço antigo",
  price: "Preço",
};

/** Classes Tailwind por zona para o bloco de pré-visualização (fundo + borda tracejada). */
const PREVIEW_ZONE_STYLES: Record<LayoutZoneType, string> = {
  image: "bg-amber-100/80 border-green-400 border-dashed",
  icons: "bg-pink-100/80 border-pink-400 border-dashed min-h-[28px]",
  name: "bg-sky-100/80 border-sky-400 border-dashed min-h-[2rem]",
  description: "bg-sky-50/90 border-sky-400 border-dashed min-h-[3rem]",
  ingredients: "bg-amber-50/90 border-amber-400 border-dashed min-h-[2.5rem]",
  prep_time: "bg-violet-100/80 border-violet-400 border-dashed min-h-[2rem]",
  allergens: "bg-orange-100/80 border-orange-400 border-dashed min-h-[2rem]",
  price_old: "bg-sky-100/80 border-sky-400 border-dashed min-h-[2rem] flex-1",
  price: "bg-emerald-100/80 border-emerald-500 border-dashed min-h-[2rem] flex-1",
};

const ZONE_WIDTH_LABELS: Record<ZoneWidth, string> = {
  full: "Linha inteira",
  half: "Metade (50%)",
  quarter: "Um quarto (25%)",
};

/** Alturas aproximadas por zona (px) para o cálculo sugerido. Largura do card ~320px => imagem 4:3 ≈ 240. */
const ZONE_HEIGHT_PX: Record<string, number> = {
  image: 240,
  icons: 28,
  name: 32,
  description: 48,
  ingredients: 40,
  prep_time: 32,
  allergens: 32,
  price_old: 40,
  price: 40,
};

function getEffectiveWidth(type: string, zoneWidths: Record<string, ZoneWidth> | undefined): ZoneWidth {
  if (zoneWidths?.[type]) return zoneWidths[type];
  return type === "price_old" || type === "price" ? "half" : "full";
}

/** Agrupa zoneOrder em linhas conforme zoneWidths: full = linha de 1; consecutivos half = linha de 2; consecutivos quarter = linha de até 4. */
function groupZonesIntoRows(
  zoneOrder: string[],
  zoneWidths: Record<string, ZoneWidth> | undefined
): string[][] {
  const rows: string[][] = [];
  let i = 0;
  while (i < zoneOrder.length) {
    const type = zoneOrder[i];
    const w = getEffectiveWidth(type, zoneWidths);
    if (w === "full") {
      rows.push([type]);
      i += 1;
    } else if (w === "half") {
      const group = [type];
      i += 1;
      while (i < zoneOrder.length && getEffectiveWidth(zoneOrder[i], zoneWidths) === "half") {
        group.push(zoneOrder[i]);
        i += 1;
        if (group.length >= 2) break;
      }
      rows.push(group);
    } else {
      const group = [type];
      i += 1;
      while (i < zoneOrder.length && getEffectiveWidth(zoneOrder[i], zoneWidths) === "quarter") {
        group.push(zoneOrder[i]);
        i += 1;
        if (group.length >= 4) break;
      }
      rows.push(group);
    }
  }
  return rows;
}

type Props = {
  templateId: string;
  templateName: string;
  initialLayout: LayoutDefinition | null;
};

/** Default zoneWidths: price_old e price a metade (mesma linha) para compatibilidade. */
function getDefaultZoneWidths(zoneOrder: string[]): Record<string, ZoneWidth> {
  const out: Record<string, ZoneWidth> = {};
  zoneOrder.forEach((z) => {
    out[z] = z === "price_old" || z === "price" ? "half" : "full";
  });
  return out;
}

export function LayoutEditorClient({ templateId, templateName, initialLayout }: Props) {
  const defaultLayout = getDefaultLayoutDefinition();
  const [canvasHeight, setCanvasHeight] = useState<number>(
    initialLayout?.canvasHeight ?? defaultLayout.canvasHeight ?? DEFAULT_CANVAS_HEIGHT
  );
  const [zoneOrder, setZoneOrder] = useState<string[]>(
    initialLayout?.zoneOrder?.length ? initialLayout.zoneOrder : defaultLayout.zoneOrder
  );
  const [zoneWidths, setZoneWidths] = useState<Record<string, ZoneWidth>>(() => {
    const order = initialLayout?.zoneOrder?.length ? initialLayout.zoneOrder : defaultLayout.zoneOrder;
    if (initialLayout?.zoneWidths && typeof initialLayout.zoneWidths === "object") {
      const valid: Record<string, ZoneWidth> = {};
      const allowed = new Set<ZoneWidth>(["full", "half", "quarter"]);
      for (const [k, v] of Object.entries(initialLayout.zoneWidths)) {
        if (LAYOUT_ZONE_TYPES.includes(k as LayoutZoneType) && allowed.has(v as ZoneWidth))
          valid[k] = v as ZoneWidth;
      }
      if (Object.keys(valid).length > 0) return valid;
    }
    return getDefaultZoneWidths(order);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [suggestedHeightMessage, setSuggestedHeightMessage] = useState<string | null>(null);

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setZoneOrder((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    if (index >= zoneOrder.length - 1) return;
    setZoneOrder((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const remove = useCallback((index: number) => {
    setZoneOrder((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addZone = useCallback((type: LayoutZoneType) => {
    if (zoneOrder.includes(type)) return;
    setZoneOrder((prev) => [...prev, type]);
  }, [zoneOrder]);

  const availableToAdd = LAYOUT_ZONE_TYPES.filter((t) => !zoneOrder.includes(t));

  const zoneRows = useMemo(() => groupZonesIntoRows(zoneOrder, zoneWidths), [zoneOrder, zoneWidths]);

  const calculateSuggestedHeight = useCallback(() => {
    let total = 0;
    zoneOrder.forEach((type) => {
      total += ZONE_HEIGHT_PX[type] ?? 32;
    });
    const suggested = Math.max(200, Math.min(1200, total));
    setCanvasHeight(suggested);
    setSuggestedHeightMessage(`Altura sugerida: ${suggested} px (pode ajustar manualmente).`);
    setTimeout(() => setSuggestedHeightMessage(null), 4000);
  }, [zoneOrder]);

  const setZoneWidth = useCallback((type: string, width: ZoneWidth) => {
    setZoneWidths((prev) => ({ ...prev, [type]: width }));
  }, []);

  const handleSave = useCallback(async () => {
    if (zoneOrder.length === 0) {
      setError("Indique pelo menos um campo na ordem.");
      return;
    }
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const payload: { canvasHeight?: number; zoneOrder: string[]; zoneWidths?: Record<string, ZoneWidth> } = {
        canvasHeight: canvasHeight > 0 ? canvasHeight : undefined,
        zoneOrder,
      };
      const widthsToSave: Record<string, ZoneWidth> = {};
      zoneOrder.forEach((z) => {
        const w = zoneWidths[z] ?? (z === "price_old" || z === "price" ? "half" : "full");
        if (w !== "full") widthsToSave[z] = w;
      });
      if (Object.keys(widthsToSave).length > 0) payload.zoneWidths = widthsToSave;
      const result = await updatePresentationTemplateLayout(templateId, payload);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }, [templateId, canvasHeight, zoneOrder, zoneWidths]);

  const renderPreviewBlock = (type: string, inRow: boolean) => {
    const label = PREVIEW_ZONE_LABELS[type as LayoutZoneType] ?? LAYOUT_ZONE_LABELS[type as LayoutZoneType] ?? type;
    const style = PREVIEW_ZONE_STYLES[type as LayoutZoneType] ?? "bg-slate-200/80 border-slate-400 border-dashed";
    const baseClass = inRow ? "flex-1 min-w-0 border-2 flex items-center justify-center px-2 py-1.5" : "w-full border-2 flex items-center justify-center px-2 py-1.5";
    if (type === "image") {
      return (
        <div key={type} className={`${inRow ? "flex-1 min-w-0" : "w-full"} aspect-[4/3] flex items-center justify-center border-2 ${style}`}>
          <span className="text-sm font-medium text-slate-600">{label}</span>
        </div>
      );
    }
    if (type === "allergens") {
      return (
        <div key={type} className={`${baseClass} gap-1.5 flex-wrap ${style}`}>
          <span className="text-sm font-medium text-slate-600">{label}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-orange-200/60 text-orange-800 border border-orange-400/50">…</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-200/60 text-emerald-800 border border-emerald-400/50">…</span>
        </div>
      );
    }
    return (
      <div key={type} className={`${baseClass} ${style}`}>
        <span className="text-sm font-medium text-slate-600 text-center">{label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div aria-describedby="preview-description">
        <h3 className="text-slate-200 font-medium mb-2">Pré-visualização do card</h3>
        <p id="preview-description" className="text-slate-400 text-sm mb-3">
          Representação aproximada do card no menu público. A ordem e as zonas refletem as definições abaixo.
        </p>
        <div
          className="max-w-sm rounded-xl border-2 border-dashed border-slate-500 bg-slate-100/50 overflow-hidden flex flex-col"
          style={{ minHeight: `${canvasHeight}px` }}
        >
          {zoneRows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className={`flex items-stretch gap-0 ${row.length > 1 ? "flex flex-row border-t-2 border-dashed border-slate-400" : ""}`}
            >
              {row.map((type) => renderPreviewBlock(type, row.length > 1))}
            </div>
          ))}
        </div>
      </div>

      <div>
        <Input
          id="canvas-height"
          type="number"
          min={200}
          max={1200}
          step={10}
          label="Altura mínima do card (px)"
          value={canvasHeight}
          onChange={(e) => setCanvasHeight(Number(e.target.value) || DEFAULT_CANVAS_HEIGHT)}
        />
        <div className="mt-2 flex items-center gap-2">
          <Button type="button" variant="outline" onClick={calculateSuggestedHeight}>
            Calcular altura sugerida
          </Button>
          {suggestedHeightMessage && (
            <span className="text-slate-400 text-sm">{suggestedHeightMessage}</span>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-slate-200 font-medium mb-2">Ordem dos campos</h3>
        <ul className="space-y-1">
          {zoneOrder.map((type, index) => (
            <li
              key={`${type}-${index}`}
              className="flex items-center gap-2 py-1.5 px-2 rounded bg-slate-700/50 border border-slate-600 flex-wrap"
            >
              <span className="flex-1 min-w-0 text-slate-200">{LAYOUT_ZONE_LABELS[type as LayoutZoneType] ?? type}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-slate-400 text-xs">Largura</label>
                <select
                  className="rounded border border-slate-600 bg-slate-800 text-slate-200 px-2 py-1 text-xs"
                  value={zoneWidths[type] ?? (type === "price_old" || type === "price" ? "half" : "full")}
                  onChange={(e) => setZoneWidth(type, e.target.value as ZoneWidth)}
                >
                  {(["full", "half", "quarter"] as const).map((w) => (
                    <option key={w} value={w}>{ZONE_WIDTH_LABELS[w]}</option>
                  ))}
                </select>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="py-0.5 px-1.5 text-xs"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                  >
                    Subir
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="py-0.5 px-1.5 text-xs"
                    onClick={() => moveDown(index)}
                    disabled={index === zoneOrder.length - 1}
                  >
                    Descer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="py-0.5 px-1.5 text-xs text-red-300 border-red-500/50"
                    onClick={() => remove(index)}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {availableToAdd.length > 0 && (
        <div>
          <label className="block text-slate-300 text-sm font-medium mb-1">Adicionar campo</label>
          <select
            className="w-full max-w-xs rounded border border-slate-600 bg-slate-800 text-slate-200 px-3 py-2 text-sm"
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v && LAYOUT_ZONE_TYPES.includes(v as LayoutZoneType)) addZone(v as LayoutZoneType);
              e.target.value = "";
            }}
          >
            <option value="">— escolher —</option>
            {availableToAdd.map((t) => (
              <option key={t} value={t}>
                {LAYOUT_ZONE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}
      {saved && <Alert variant="success">Layout guardado.</Alert>}

      <div className="flex gap-2 items-center">
        <Button type="button" variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "A guardar…" : "Guardar"}
        </Button>
        <Link href="/portal-admin/settings/presentation-templates">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </div>
  );
}
