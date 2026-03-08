"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { updateCategoryTitleAppearance, resetCategoryTitleAppearance } from "../../actions";
import { Input, Button, Alert, Select } from "@/components/admin";

const ALIGN_OPTIONS: { value: string; label: string }[] = [
  { value: "left", label: "Esquerda" },
  { value: "center", label: "Centro" },
  { value: "right", label: "Direita" },
];

export function CategoryTitleAppearanceForm({
  storeId,
  initial,
}: {
  storeId: string;
  initial: {
    category_title_align?: string;
    category_title_margin_bottom?: string;
    category_title_padding_top?: string;
    category_title_indent_px?: string;
    category_title_color?: string;
  };
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(updateCategoryTitleAppearance, null);
  const [resetState, resetFormAction] = useFormState(resetCategoryTitleAppearance, null);

  useEffect(() => {
    if (resetState?.success) router.refresh();
  }, [resetState?.success, router]);

  return (
    <div className="flex flex-col gap-4 max-w-md">
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="store_id" value={storeId} />
      <Select
        id="category_title_align"
        name="category_title_align"
        label="Alinhamento do texto"
        defaultValue={initial.category_title_align ?? "left"}
      >
        {ALIGN_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
      <Input
        id="category_title_margin_bottom"
        name="category_title_margin_bottom"
        label="Margem inferior (px)"
        type="number"
        min={0}
        defaultValue={initial.category_title_margin_bottom ?? "15"}
        placeholder="15"
      />
      <p className="text-xs text-slate-500 -mt-2">Espaço entre o título e o conteúdo abaixo.</p>
      <Input
        id="category_title_padding_top"
        name="category_title_padding_top"
        label="Espaçamento superior (px)"
        type="number"
        min={0}
        defaultValue={initial.category_title_padding_top ?? "16"}
        placeholder="16"
      />
      <Input
        id="category_title_indent_px"
        name="category_title_indent_px"
        label="Avanço em relação às secções (px)"
        type="number"
        min={0}
        defaultValue={initial.category_title_indent_px ?? "10"}
        placeholder="10"
      />
      <p className="text-xs text-slate-500 -mt-2">
        Quanto o bloco das categorias avança para a direita em relação aos títulos de secção.
      </p>
      <Input
        id="category_title_color"
        name="category_title_color"
        label="Cor do texto"
        type="text"
        defaultValue={initial.category_title_color ?? "rgb(167, 143, 57)"}
        placeholder="ex: rgb(167, 143, 57) ou #A78F39"
      />
      <Button type="submit" variant="primary">
        Guardar
      </Button>
      {state?.error && <Alert variant="error">{state.error}</Alert>}
    </form>
    <form action={resetFormAction} className="flex flex-col gap-2">
      <input type="hidden" name="store_id" value={storeId} />
      <p className="text-xs text-slate-500">Volta a aplicar os valores iniciais (ex.: esquerda, 15px/16px, avanço 10px, cor dourada).</p>
      <Button type="submit" variant="secondary">
        Repor valores por defeito
      </Button>
      {resetState?.error && <Alert variant="error">{resetState.error}</Alert>}
    </form>
    </div>
  );
}
