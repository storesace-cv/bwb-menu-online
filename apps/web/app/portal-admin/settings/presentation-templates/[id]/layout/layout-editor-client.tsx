"use client";

import { useState, useCallback, useMemo } from "react";
import {
  LAYOUT_ZONE_TYPES,
  LAYOUT_ZONE_LABELS,
  getDefaultLayoutDefinition,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_ZONE_HEIGHTS,
  DEFAULT_CONTENT_PADDING_PX,
  DEFAULT_CONTENT_ROW_GAP_PX,
  CONTENT_PADDING_PRESETS,
  CONTENT_ROW_GAP_PRESETS,
  CONTENT_FONT_SIZE_LABELS,
  CONTENT_FONT_WEIGHT_LABELS,
  CONTENT_LINE_HEIGHT_LABELS,
  parseZoneWidthPercent,
  groupZonesIntoRowsByLineNumber,
  groupZonesIntoRowsByWidthPercent,
  type LayoutDefinition,
  type LayoutZoneType,
  type ZoneWidth,
  type ContentFontSize,
  type ContentFontWeight,
  type ContentLineHeight,
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

/** Presets para espaçamento entre linhas (px). */
const ROW_SPACING_PRESETS = [
  { label: "Compacto (2)", value: 2 },
  { label: "Reduzido (4)", value: 4 },
  { label: "Normal (8)", value: 8 },
  { label: "Amplo (16)", value: 16 },
] as const;
const DEFAULT_ROW_SPACING_PX = 8;

/** Limites para altura por zona (px). */
const ZONE_HEIGHT_MIN = 12;
const ZONE_HEIGHT_MAX = 600;

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

type LayoutUpdateFn = (templateId: string, payload: Parameters<typeof updatePresentationTemplateLayout>[1]) => Promise<{ error?: string }>;

type Props = {
  templateId: string;
  templateName: string;
  initialLayout: LayoutDefinition | null;
  /** Quando fornecido (ex.: editor de modelos de destaques), usa esta função em vez de updatePresentationTemplateLayout. */
  onUpdateLayout?: LayoutUpdateFn;
};

/** Default zoneWidths: price_old e price a metade (mesma linha) para compatibilidade. */
function getDefaultZoneWidths(zoneOrder: string[]): Record<string, ZoneWidth> {
  const out: Record<string, ZoneWidth> = {};
  zoneOrder.forEach((z) => {
    out[z] = z === "price_old" || z === "price" ? "half" : "full";
  });
  return out;
}

function getDefaultWidthPercent(type: string): number {
  return type === "price_old" || type === "price" ? 50 : 100;
}

/** Deriva zoneWidthPercent a partir de initialLayout (zoneWidthPercent ou zoneWidths). */
function getInitialZoneWidthPercent(
  order: string[],
  initialLayout: LayoutDefinition | null
): Record<string, number> {
  const out: Record<string, number> = {};
  if (initialLayout?.zoneWidthPercent && typeof initialLayout.zoneWidthPercent === "object") {
    order.forEach((z) => {
      const p = initialLayout.zoneWidthPercent![z];
      if (typeof p === "number" && p >= 1 && p <= 100) out[z] = Math.round(p);
      else out[z] = getDefaultWidthPercent(z);
    });
    return out;
  }
  if (initialLayout?.zoneWidths && typeof initialLayout.zoneWidths === "object") {
    const map: Record<string, number> = { full: 100, half: 50, quarter: 25 };
    order.forEach((z) => {
      const w = initialLayout.zoneWidths![z];
      out[z] = w && map[w] != null ? map[w] : getDefaultWidthPercent(z);
    });
    return out;
  }
  order.forEach((z) => { out[z] = getDefaultWidthPercent(z); });
  return out;
}

/** Converte percent (1-100) em ZoneWidth para payload de compatibilidade. */
function percentToZoneWidth(p: number): ZoneWidth {
  if (p <= 25) return "quarter";
  if (p <= 50) return "half";
  return "full";
}

function getDefaultZoneHeights(zoneOrder: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  zoneOrder.forEach((z) => {
    if (LAYOUT_ZONE_TYPES.includes(z as LayoutZoneType))
      out[z] = DEFAULT_ZONE_HEIGHTS[z as LayoutZoneType];
  });
  return out;
}

function getEffectiveZoneHeight(
  type: string,
  zoneHeights: Record<string, number> | undefined
): number {
  if (zoneHeights?.[type] != null && Number.isFinite(zoneHeights[type])) {
    const n = Math.round(zoneHeights[type]);
    if (n === 0) return 0;
    return Math.max(ZONE_HEIGHT_MIN, Math.min(ZONE_HEIGHT_MAX, n));
  }
  return DEFAULT_ZONE_HEIGHTS[type as LayoutZoneType] ?? 32;
}

/** Altura mínima do card: null = automático (conteúdo); number = fixo em px. */
function getInitialCanvasHeight(initialLayout: LayoutDefinition | null): number | null {
  const v = initialLayout?.canvasHeight;
  if (v != null && Number.isFinite(v) && v > 0) return Math.round(Number(v));
  return null;
}

export function LayoutEditorClient({ templateId, templateName, initialLayout, onUpdateLayout }: Props) {
  const defaultLayout = getDefaultLayoutDefinition();
  const [canvasHeight, setCanvasHeight] = useState<number | null>(() =>
    getInitialCanvasHeight(initialLayout)
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
  const [zoneWidthPercent, setZoneWidthPercent] = useState<Record<string, number>>(() => {
    const order = initialLayout?.zoneOrder?.length ? initialLayout.zoneOrder : defaultLayout.zoneOrder;
    return getInitialZoneWidthPercent(order, initialLayout);
  });
  const [zoneLineNumbers, setZoneLineNumbers] = useState<Record<string, number>>(() => {
    const order = initialLayout?.zoneOrder?.length ? initialLayout.zoneOrder : defaultLayout.zoneOrder;
    const out: Record<string, number> = {};
    if (initialLayout?.zoneLineNumbers && typeof initialLayout.zoneLineNumbers === "object") {
      order.forEach((z) => {
        const n = initialLayout.zoneLineNumbers![z];
        if (typeof n === "number" && n >= 1) out[z] = Math.round(n);
      });
    }
    return out;
  });
  const [rowSpacingPx, setRowSpacingPx] = useState<number>(
    initialLayout?.rowSpacingPx ?? DEFAULT_ROW_SPACING_PX
  );
  const [zoneHeights, setZoneHeights] = useState<Record<string, number>>(() => {
    const order = initialLayout?.zoneOrder?.length ? initialLayout.zoneOrder : defaultLayout.zoneOrder;
    const base = getDefaultZoneHeights(order);
    if (initialLayout?.zoneHeights && typeof initialLayout.zoneHeights === "object") {
      for (const [k, v] of Object.entries(initialLayout.zoneHeights)) {
        if (LAYOUT_ZONE_TYPES.includes(k as LayoutZoneType) && typeof v === "number" && Number.isFinite(v)) {
          const n = Math.round(Number(v));
          if (n >= 0 && n <= ZONE_HEIGHT_MAX) base[k] = n;
        }
      }
    }
    return base;
  });
  const [contentPaddingPx, setContentPaddingPx] = useState<number>(
    initialLayout?.contentPaddingPx != null && Number.isFinite(initialLayout.contentPaddingPx)
      ? Math.max(0, Math.min(24, Math.round(Number(initialLayout.contentPaddingPx))))
      : DEFAULT_CONTENT_PADDING_PX
  );
  const [contentRowGapPx, setContentRowGapPx] = useState<number>(
    initialLayout?.contentRowGapPx != null && Number.isFinite(initialLayout.contentRowGapPx)
      ? Math.max(0, Math.min(24, Math.round(Number(initialLayout.contentRowGapPx))))
      : DEFAULT_CONTENT_ROW_GAP_PX
  );
  const [nameFontSize, setNameFontSize] = useState<ContentFontSize>(
    initialLayout?.nameFontSize === "sm" || initialLayout?.nameFontSize === "base" || initialLayout?.nameFontSize === "lg"
      ? initialLayout.nameFontSize
      : "lg"
  );
  const [nameFontWeight, setNameFontWeight] = useState<ContentFontWeight>(
    initialLayout?.nameFontWeight === "semibold" || initialLayout?.nameFontWeight === "bold"
      ? initialLayout.nameFontWeight
      : "bold"
  );
  const [priceFontSize, setPriceFontSize] = useState<ContentFontSize>(
    initialLayout?.priceFontSize === "sm" || initialLayout?.priceFontSize === "base" || initialLayout?.priceFontSize === "lg"
      ? initialLayout.priceFontSize
      : "base"
  );
  const [priceLineHeight, setPriceLineHeight] = useState<ContentLineHeight>(
    initialLayout?.priceLineHeight === "none" || initialLayout?.priceLineHeight === "normal"
      ? initialLayout.priceLineHeight
      : "normal"
  );
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
    setZoneWidthPercent((prev) => ({ ...prev, [type]: getDefaultWidthPercent(type) }));
  }, [zoneOrder]);

  const availableToAdd = LAYOUT_ZONE_TYPES.filter((t) => !zoneOrder.includes(t));

  const zoneRows = useMemo(() => {
    const byLine = groupZonesIntoRowsByLineNumber(zoneOrder, zoneLineNumbers);
    if (byLine != null && byLine.length > 0) return byLine;
    return groupZonesIntoRowsByWidthPercent(zoneOrder, zoneWidthPercent, zoneWidths);
  }, [zoneOrder, zoneLineNumbers, zoneWidthPercent, zoneWidths]);

  const computeSuggestedHeight = useCallback(() => {
    let total = 0;
    zoneOrder.forEach((type) => {
      total += getEffectiveZoneHeight(type, zoneHeights);
    });
    return Math.max(200, Math.min(1200, total));
  }, [zoneOrder, zoneHeights]);

  const calculateSuggestedHeight = useCallback(() => {
    const suggested = computeSuggestedHeight();
    setCanvasHeight(suggested);
    setSuggestedHeightMessage(`Altura sugerida: ${suggested} px (pode ajustar manualmente).`);
    setTimeout(() => setSuggestedHeightMessage(null), 4000);
  }, [computeSuggestedHeight]);

  const setZoneWidth = useCallback((type: string, width: ZoneWidth) => {
    setZoneWidths((prev) => ({ ...prev, [type]: width }));
  }, []);

  const setZoneWidthPercentValue = useCallback((type: string, percent: number) => {
    const p = Math.max(1, Math.min(100, Math.round(percent)));
    setZoneWidthPercent((prev) => ({ ...prev, [type]: p }));
    setZoneWidths((prev) => ({ ...prev, [type]: percentToZoneWidth(p) }));
  }, []);

  const setZoneLineNumber = useCallback((type: string, value: number) => {
    if (value < 1) {
      setZoneLineNumbers((prev) => {
        const next = { ...prev };
        delete next[type];
        return next;
      });
    } else {
      setZoneLineNumbers((prev) => ({ ...prev, [type]: Math.round(value) }));
    }
  }, []);

  const setZoneHeight = useCallback((type: string, value: number) => {
    const n = Math.round(value);
    const clamped = n === 0 ? 0 : Math.max(ZONE_HEIGHT_MIN, Math.min(ZONE_HEIGHT_MAX, n));
    setZoneHeights((prev) => ({ ...prev, [type]: clamped }));
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
      const payload: Parameters<typeof updatePresentationTemplateLayout>[1] = {
        ...(canvasHeight != null && canvasHeight > 0 ? { canvasHeight } : {}),
        zoneOrder,
        rowSpacingPx: rowSpacingPx >= 0 && rowSpacingPx <= 48 ? rowSpacingPx : DEFAULT_ROW_SPACING_PX,
        contentPaddingPx: contentPaddingPx >= 0 && contentPaddingPx <= 24 ? contentPaddingPx : DEFAULT_CONTENT_PADDING_PX,
        contentRowGapPx: contentRowGapPx >= 0 && contentRowGapPx <= 24 ? contentRowGapPx : DEFAULT_CONTENT_ROW_GAP_PX,
        nameFontSize,
        nameFontWeight,
        priceFontSize,
        priceLineHeight,
      };
      const widthsToSave: Record<string, ZoneWidth> = {};
      const percentsToSave: Record<string, number> = {};
      zoneOrder.forEach((z) => {
        const p = zoneWidthPercent[z] ?? getDefaultWidthPercent(z);
        const w = percentToZoneWidth(p);
        if (w !== "full") widthsToSave[z] = w;
        if (p !== 100) percentsToSave[z] = p;
      });
      if (Object.keys(widthsToSave).length > 0) payload.zoneWidths = widthsToSave;
      if (Object.keys(percentsToSave).length > 0) payload.zoneWidthPercent = percentsToSave;
      const lineNumbersToSave: Record<string, number> = {};
      zoneOrder.forEach((z) => {
        const n = zoneLineNumbers[z];
        if (typeof n === "number" && n >= 1) lineNumbersToSave[z] = Math.round(n);
      });
      if (Object.keys(lineNumbersToSave).length > 0) payload.zoneLineNumbers = lineNumbersToSave;
      const heightsToSave: Record<string, number> = {};
      zoneOrder.forEach((z) => {
        const effective = getEffectiveZoneHeight(z, zoneHeights);
        const defaultH = DEFAULT_ZONE_HEIGHTS[z as LayoutZoneType] ?? 32;
        if (effective !== defaultH) heightsToSave[z] = effective;
      });
      if (Object.keys(heightsToSave).length > 0) payload.zoneHeights = heightsToSave;
      const updateFn = onUpdateLayout ?? updatePresentationTemplateLayout;
      // #region agent log
      fetch("http://127.0.0.1:7601/ingest/52367c06-eb17-45e9-837c-183658165c22", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2129fe" }, body: JSON.stringify({ sessionId: "2129fe", location: "layout-editor-client.tsx:save", message: "save_start", data: { templateId }, timestamp: Date.now(), hypothesisId: "A" }) }).catch(() => {});
      // #endregion
      let result: Awaited<ReturnType<typeof updateFn>>;
      try {
        result = await updateFn(templateId, payload);
      } catch (firstErr) {
        const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
        const isFetchLike = /fetch failed|failed to fetch|load failed|networkerror|network error/i.test(msg);
        if (isFetchLike) {
          result = await updateFn(templateId, payload);
        } else {
          throw firstErr;
        }
      }
      if (result?.error) {
        // #region agent log
        fetch("http://127.0.0.1:7601/ingest/52367c06-eb17-45e9-837c-183658165c22", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2129fe" }, body: JSON.stringify({ sessionId: "2129fe", location: "layout-editor-client.tsx:save", message: "save_result_error", data: { error: result.error }, timestamp: Date.now(), hypothesisId: "D" }) }).catch(() => {});
        // #endregion
        setError(result.error);
        return;
      }
      // #region agent log
      fetch("http://127.0.0.1:7601/ingest/52367c06-eb17-45e9-837c-183658165c22", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2129fe" }, body: JSON.stringify({ sessionId: "2129fe", location: "layout-editor-client.tsx:save", message: "save_ok", data: {}, timestamp: Date.now(), hypothesisId: "A" }) }).catch(() => {});
      // #endregion
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      // #region agent log
      fetch("http://127.0.0.1:7601/ingest/52367c06-eb17-45e9-837c-183658165c22", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2129fe" }, body: JSON.stringify({ sessionId: "2129fe", location: "layout-editor-client.tsx:save", message: "save_failed", data: { name: e.name, message: e.message }, timestamp: Date.now(), hypothesisId: "A" }) }).catch(() => {});
      // #endregion
      setError(e.message || "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  }, [
    templateId,
    canvasHeight,
    zoneOrder,
    zoneWidths,
    zoneWidthPercent,
    zoneLineNumbers,
    zoneHeights,
    rowSpacingPx,
    contentPaddingPx,
    contentRowGapPx,
    nameFontSize,
    nameFontWeight,
    priceFontSize,
    priceLineHeight,
  ]);

  const renderPreviewBlock = (type: string, inRow: boolean, widthPercent?: number) => {
    const label = PREVIEW_ZONE_LABELS[type as LayoutZoneType] ?? LAYOUT_ZONE_LABELS[type as LayoutZoneType] ?? type;
    const style = PREVIEW_ZONE_STYLES[type as LayoutZoneType] ?? "bg-slate-200/80 border-slate-400 border-dashed";
    const p = widthPercent ?? parseZoneWidthPercent(type, zoneWidthPercent, zoneWidths);
    const rowWidthStyle: React.CSSProperties = inRow && p > 0 ? { flex: `0 0 ${p}%`, boxSizing: "border-box" } : {};
    const baseClass = inRow ? "min-w-0 border-2 flex items-center justify-center px-2 py-1.5" : "w-full border-2 flex items-center justify-center px-2 py-1.5";
    const heightPx = getEffectiveZoneHeight(type, zoneHeights);
    const zoneStyle: React.CSSProperties = { ...rowWidthStyle, ...(heightPx > 0 ? (type === "image" ? { height: `${heightPx}px`, minHeight: `${heightPx}px` } : { minHeight: `${heightPx}px` }) : (type === "image" ? { minHeight: "24px" } : {})) };
    if (type === "image") {
      return (
        <div
          key={type}
          className={`${inRow ? "min-w-0" : "w-full"} flex items-center justify-center border-2 ${style}`}
          style={zoneStyle}
        >
          <span className="text-sm font-medium text-slate-600">{label}</span>
        </div>
      );
    }
    if (type === "allergens") {
      return (
        <div key={type} className={`${baseClass} gap-1.5 flex-wrap ${style}`} style={zoneStyle}>
          <span className="text-sm font-medium text-slate-600">{label}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-orange-200/60 text-orange-800 border border-orange-400/50">…</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-200/60 text-emerald-800 border border-emerald-400/50">…</span>
        </div>
      );
    }
    return (
      <div key={type} className={`${baseClass} ${style}`} style={zoneStyle}>
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
        {canvasHeight === null && (
          <p className="text-slate-500 text-sm mb-2">Altura definida pelo conteúdo (mínimo possível).</p>
        )}
        <div
          className="max-w-sm rounded-xl border-2 border-dashed border-slate-500 bg-slate-100/50 overflow-hidden flex flex-col"
          style={canvasHeight != null && canvasHeight > 0 ? { minHeight: `${canvasHeight}px` } : undefined}
        >
          <div className="flex flex-col flex-1" style={{ padding: `${contentPaddingPx}px` }}>
            {zoneRows.map((row, rowIdx) => (
              <div
                key={rowIdx}
                className={`flex items-stretch ${row.length > 1 ? "flex flex-row border-t-2 border-dashed border-slate-400" : ""}`}
                style={{
                  ...(rowIdx > 0 ? { marginTop: `${rowSpacingPx}px` } : {}),
                  ...(row.length > 1 ? { gap: `${contentRowGapPx}px` } : {}),
                }}
              >
                {row.map((type) => renderPreviewBlock(type, row.length > 1, parseZoneWidthPercent(type, zoneWidthPercent, zoneWidths)))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-slate-200 font-medium mb-2">Altura mínima do card</label>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="canvas-height-mode"
              checked={canvasHeight === null}
              onChange={() => setCanvasHeight(null)}
              className="rounded border-slate-500"
            />
            <span className="text-slate-200">Automático (mínimo possível)</span>
          </label>
          <p className="text-slate-400 text-sm ml-6">O card não tem altura mínima; a altura segue o conteúdo.</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="canvas-height-mode"
              checked={canvasHeight !== null}
              onChange={() => setCanvasHeight(canvasHeight ?? computeSuggestedHeight())}
              className="rounded border-slate-500"
            />
            <span className="text-slate-200">Fixo (px)</span>
          </label>
          {canvasHeight !== null && (
            <div className="ml-6 flex flex-wrap items-center gap-2">
              <Input
                id="canvas-height"
                type="number"
                min={0}
                max={1200}
                step={10}
                aria-label="Altura mínima do card em pixels"
                value={canvasHeight}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setCanvasHeight(Number.isFinite(n) && n >= 0 ? Math.min(1200, Math.round(n)) : 0);
                }}
                className="w-24"
              />
              <span className="text-slate-400 text-sm">px (0 = como automático)</span>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={calculateSuggestedHeight}
          >
            Calcular altura sugerida
          </Button>
          {suggestedHeightMessage && (
            <span className="text-slate-400 text-sm">{suggestedHeightMessage}</span>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="row-spacing" className="block text-slate-200 font-medium mb-1">
          Espaçamento entre linhas (px)
        </label>
        <p className="text-slate-400 text-sm mb-2">
          Margem vertical entre cada linha de campos do card (ex.: entre nome e preço). Valores mais baixos reduzem o espaço vazio.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            id="row-spacing"
            type="number"
            min={0}
            max={48}
            step={1}
            value={rowSpacingPx}
            onChange={(e) => setRowSpacingPx(Math.max(0, Math.min(48, Number(e.target.value) || 0)))}
            className="w-24"
          />
          <span className="text-slate-400 text-sm">ou</span>
          <select
            className="rounded border border-slate-600 bg-slate-800 text-slate-200 px-2 py-1.5 text-sm"
            value={rowSpacingPx}
            onChange={(e) => setRowSpacingPx(Number(e.target.value))}
          >
            {ROW_SPACING_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-slate-200 font-medium mb-2">Estilo do conteúdo</h3>
        <p className="text-slate-400 text-sm mb-3">
          Padding interno do card, gap entre colunas na mesma linha e tipografia do nome e do preço.
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="content-padding" className="block text-slate-300 text-sm font-medium mb-1">
              Padding interno (px)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="content-padding"
                type="number"
                min={0}
                max={24}
                step={1}
                value={contentPaddingPx}
                onChange={(e) => setContentPaddingPx(Math.max(0, Math.min(24, Number(e.target.value) ?? 0)))}
                className="w-20"
              />
              {CONTENT_PADDING_PRESETS.map((px) => (
                <button
                  key={px}
                  type="button"
                  onClick={() => setContentPaddingPx(px)}
                  className={`rounded px-2 py-1 text-xs border ${contentPaddingPx === px ? "border-emerald-500 bg-emerald-900/40 text-emerald-200" : "border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500"}`}
                >
                  {px}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="content-row-gap" className="block text-slate-300 text-sm font-medium mb-1">
              Gap entre colunas (px)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="content-row-gap"
                type="number"
                min={0}
                max={24}
                step={1}
                value={contentRowGapPx}
                onChange={(e) => setContentRowGapPx(Math.max(0, Math.min(24, Number(e.target.value) ?? 0)))}
                className="w-20"
              />
              {CONTENT_ROW_GAP_PRESETS.map((px) => (
                <button
                  key={px}
                  type="button"
                  onClick={() => setContentRowGapPx(px)}
                  className={`rounded px-2 py-1 text-xs border ${contentRowGapPx === px ? "border-emerald-500 bg-emerald-900/40 text-emerald-200" : "border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500"}`}
                >
                  {px}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-slate-300 text-sm font-medium mb-1">Nome do artigo</span>
              <div className="flex flex-wrap gap-2">
                <select
                  className="rounded border border-slate-600 bg-slate-800 text-slate-200 px-2 py-1.5 text-sm"
                  value={nameFontSize}
                  onChange={(e) => setNameFontSize(e.target.value as ContentFontSize)}
                >
                  {(Object.entries(CONTENT_FONT_SIZE_LABELS) as [ContentFontSize, string][]).map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
                <select
                  className="rounded border border-slate-600 bg-slate-800 text-slate-200 px-2 py-1.5 text-sm"
                  value={nameFontWeight}
                  onChange={(e) => setNameFontWeight(e.target.value as ContentFontWeight)}
                >
                  {(Object.entries(CONTENT_FONT_WEIGHT_LABELS) as [ContentFontWeight, string][]).map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <span className="block text-slate-300 text-sm font-medium mb-1">Preço</span>
              <div className="flex flex-wrap gap-2">
                <select
                  className="rounded border border-slate-600 bg-slate-800 text-slate-200 px-2 py-1.5 text-sm"
                  value={priceFontSize}
                  onChange={(e) => setPriceFontSize(e.target.value as ContentFontSize)}
                >
                  {(Object.entries(CONTENT_FONT_SIZE_LABELS) as [ContentFontSize, string][]).map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
                <select
                  className="rounded border border-slate-600 bg-slate-800 text-slate-200 px-2 py-1.5 text-sm"
                  value={priceLineHeight}
                  onChange={(e) => setPriceLineHeight(e.target.value as ContentLineHeight)}
                >
                  {(Object.entries(CONTENT_LINE_HEIGHT_LABELS) as [ContentLineHeight, string][]).map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
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
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-slate-400 text-xs">Largura</label>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={zoneWidthPercent[type] ?? getDefaultWidthPercent(type)}
                    onChange={(e) => setZoneWidthPercentValue(type, Number(e.target.value))}
                    className="w-20 h-2 rounded accent-emerald-500"
                    aria-label={`Largura ${LAYOUT_ZONE_LABELS[type as LayoutZoneType] ?? type}`}
                  />
                  <span className="text-slate-300 text-xs w-8 tabular-nums">
                    {zoneWidthPercent[type] ?? getDefaultWidthPercent(type)} %
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-slate-400 text-xs">Nº Linha</label>
                  <input
                    type="number"
                    min={1}
                    className="w-14 rounded border border-slate-600 bg-slate-800 text-slate-200 px-2 py-1 text-xs"
                    value={zoneLineNumbers[type] ?? ""}
                    placeholder="auto"
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      const n = v === "" ? 0 : parseInt(v, 10);
                      setZoneLineNumber(type, Number.isFinite(n) ? n : 0);
                    }}
                    aria-label={`Número da linha ${LAYOUT_ZONE_LABELS[type as LayoutZoneType] ?? type}`}
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400 text-xs">Altura</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name={`zone-height-${type}-${index}`}
                      checked={zoneHeights[type] === 0}
                      onChange={() => setZoneHeight(type, 0)}
                      className="rounded border-slate-500"
                    />
                    <span className="text-slate-300 text-xs">Auto</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name={`zone-height-${type}-${index}`}
                      checked={zoneHeights[type] !== 0}
                      onChange={() => setZoneHeight(type, DEFAULT_ZONE_HEIGHTS[type as LayoutZoneType] ?? 32)}
                      className="rounded border-slate-500"
                    />
                    <span className="text-slate-300 text-xs">Fixo (px)</span>
                  </label>
                  {zoneHeights[type] !== 0 && (
                    <input
                      type="number"
                      min={ZONE_HEIGHT_MIN}
                      max={ZONE_HEIGHT_MAX}
                      step={4}
                      className="w-16 rounded border border-slate-600 bg-slate-800 text-slate-200 px-2 py-1 text-xs"
                      value={getEffectiveZoneHeight(type, zoneHeights)}
                      onChange={(e) => setZoneHeight(type, Number(e.target.value) || ZONE_HEIGHT_MIN)}
                    />
                  )}
                </div>
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
        <a href="/portal-admin/settings/presentation-templates">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </a>
      </div>
    </div>
  );
}
