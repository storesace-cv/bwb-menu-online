"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { updateSectionTitleAppearance, resetSectionTitleAppearance } from "../../actions";
import { useFormSubmitLoading } from "@/lib/use-form-submit-loading";
import { Input, Button, Alert, Select, ColorPickerField, SubmitButton } from "@/components/admin";

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
  const router = useRouter();
  const [state, formAction] = useFormState(updateSectionTitleAppearance, null);
  const [resetState, resetFormAction] = useFormState(resetSectionTitleAppearance, null);
  const [submitting, formBind] = useFormSubmitLoading(state);
  const [resetSubmitting, resetFormBind] = useFormSubmitLoading(resetState);

  useEffect(() => {
    if (resetState?.success) router.refresh();
  }, [resetState?.success, router]);

  return (
    <div className="flex flex-col gap-4 max-w-md">
    <form action={formAction} className="flex flex-col gap-4">
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
      <ColorPickerField
        id="section_title_color"
        name="section_title_color"
        label="Cor do texto (opcional)"
        defaultValue={initial.section_title_color ?? ""}
        defaultHex="#000000"
        placeholder="Deixar vazio para usar a cor normal do tema"
        allowEmpty
      />
      <SubmitButton variant="primary" submitting={submitting} loadingText="A guardar…">
        Guardar
      </SubmitButton>
      {state?.error && <Alert variant="error">{state.error}</Alert>}
    </form>
    <form action={resetFormAction} className="flex flex-col gap-2" {...resetFormBind}>
      <input type="hidden" name="store_id" value={storeId} />
      <p className="text-xs text-slate-500">Volta a aplicar os valores iniciais (ex.: centro, 20px, cor herdada).</p>
      <SubmitButton variant="secondary" submitting={resetSubmitting} loadingText="A repor…">
        Repor valores por defeito
      </SubmitButton>
      {resetState?.error && <Alert variant="error">{resetState.error}</Alert>}
    </form>
    </div>
  );
}
