"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  LAYOUT_ZONE_TYPES,
  LAYOUT_ZONE_LABELS,
  getDefaultLayoutDefinition,
  DEFAULT_CANVAS_HEIGHT,
  type LayoutDefinition,
  type LayoutZoneType,
} from "@/lib/presentation-templates";
import { updatePresentationTemplateLayout } from "@/app/portal-admin/actions";
import { Button, Input, Alert } from "@/components/admin";

type Props = {
  templateId: string;
  templateName: string;
  initialLayout: LayoutDefinition | null;
};

export function LayoutEditorClient({ templateId, templateName, initialLayout }: Props) {
  const defaultLayout = getDefaultLayoutDefinition();
  const [canvasHeight, setCanvasHeight] = useState<number>(
    initialLayout?.canvasHeight ?? defaultLayout.canvasHeight ?? DEFAULT_CANVAS_HEIGHT
  );
  const [zoneOrder, setZoneOrder] = useState<string[]>(
    initialLayout?.zoneOrder?.length ? initialLayout.zoneOrder : defaultLayout.zoneOrder
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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

  const handleSave = useCallback(async () => {
    if (zoneOrder.length === 0) {
      setError("Indique pelo menos um campo na ordem.");
      return;
    }
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const result = await updatePresentationTemplateLayout(templateId, {
        canvasHeight: canvasHeight > 0 ? canvasHeight : undefined,
        zoneOrder,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }, [templateId, canvasHeight, zoneOrder]);

  return (
    <div className="space-y-6">
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
      </div>

      <div>
        <h3 className="text-slate-200 font-medium mb-2">Ordem dos campos</h3>
        <ul className="space-y-1">
          {zoneOrder.map((type, index) => (
            <li
              key={`${type}-${index}`}
              className="flex items-center gap-2 py-1.5 px-2 rounded bg-slate-700/50 border border-slate-600"
            >
              <span className="flex-1 text-slate-200">{LAYOUT_ZONE_LABELS[type as LayoutZoneType] ?? type}</span>
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
