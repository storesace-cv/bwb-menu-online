"use client";

import { useFormState } from "react-dom";
import { updateSectionTitleAppearance } from "../../actions";
import { Input, Button, Alert, Select } from "@/components/admin";

const ALIGN_OPTIONS: { value: string; label: string }[] = [
  { value: "left", label: "Esquerda" },
  { value: "center", label: "Centro" },
  { value: "right", label: "Direita" },
];

export function SectionTitleAppearanceForm({
  storeId,
  initial,
}: {
  storeId: string;
  initial: {
    section_title_align?: string;
    section_title_margin_bottom?: string;
    section_title_padding_top?: string;
    section_title_color?: string;
  };
}) {
  const [state, formAction] = useFormState(updateSectionTitleAppearance, null);
  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <input type="hidden" name="store_id" value={storeId} />
      <Select
        id="section_title_align"
        name="section_title_align"
        label="Alinhamento do texto"
        defaultValue={initial.section_title_align ?? "center"}
      >
        {ALIGN_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
      <Input
        id="section_title_margin_bottom"
        name="section_title_margin_bottom"
        label="Margem inferior (px)"
        type="number"
        min={0}
        defaultValue={initial.section_title_margin_bottom ?? "20"}
        placeholder="20"
      />
      <p className="text-xs text-slate-500 -mt-2">Espaço entre o título e o conteúdo abaixo.</p>
      <Input
        id="section_title_padding_top"
        name="section_title_padding_top"
        label="Espaçamento superior (px)"
        type="number"
        min={0}
        defaultValue={initial.section_title_padding_top ?? "20"}
        placeholder="20"
      />
      <Input
        id="section_title_color"
        name="section_title_color"
        label="Cor do texto (opcional)"
        type="text"
        defaultValue={initial.section_title_color ?? ""}
        placeholder="Deixar vazio para usar a cor normal do tema"
      />
      <Button type="submit" variant="primary">
        Guardar
      </Button>
      {state?.error && <Alert variant="error">{state.error}</Alert>}
    </form>
  );
}
